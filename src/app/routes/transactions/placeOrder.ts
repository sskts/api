/**
 * 注文取引ルーター
 */
import * as cinerino from '@cinerino/domain';

import * as middlewares from '@motionpicture/express-middleware';
import * as createDebug from 'debug';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { CREATED, NO_CONTENT } from 'http-status';
import * as ioredis from 'ioredis';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

import * as redis from '../../../redis';

const debug = createDebug('cinerino-api:placeOrderTransactionsRouter');

const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const WAITER_DISABLED = process.env.WAITER_DISABLED === '1';
// tslint:disable-next-line:no-magic-numbers
const AGGREGATION_UNIT_IN_SECONDS = parseInt(<string>process.env.TRANSACTION_RATE_LIMIT_AGGREGATION_UNIT_IN_SECONDS, 10);
// tslint:disable-next-line:no-magic-numbers
const THRESHOLD = parseInt(<string>process.env.TRANSACTION_RATE_LIMIT_THRESHOLD, 10);
/**
 * 進行中取引の接続回数制限ミドルウェア
 * 取引IDを使用して動的にスコープを作成する
 */
const rateLimit4transactionInProgress =
    middlewares.rateLimit({
        redisClient: new ioredis({
            host: <string>process.env.REDIS_HOST,
            // tslint:disable-next-line:no-magic-numbers
            port: parseInt(<string>process.env.REDIS_PORT, 10),
            password: <string>process.env.REDIS_KEY,
            tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
        }),
        aggregationUnitInSeconds: AGGREGATION_UNIT_IN_SECONDS,
        threshold: THRESHOLD,
        // 制限超過時の動作をカスタマイズ
        limitExceededHandler: (__0, __1, res, next) => {
            res.setHeader('Retry-After', AGGREGATION_UNIT_IN_SECONDS);
            const message = `Retry after ${AGGREGATION_UNIT_IN_SECONDS} seconds for your transaction.`;
            next(new cinerino.factory.errors.RateLimitExceeded(message));
        },
        // スコープ生成ロジックをカスタマイズ
        scopeGenerator: (req) => `placeOrderTransaction.${<string>req.params.transactionId}`
    });

export interface ICOATicket extends cinerino.COA.services.master.ITicketResult {
    theaterCode: string;
}

let coaTickets: ICOATicket[];

function initializeCOATickets() {
    return async (repos: { place: cinerino.repository.Place }) => {
        try {
            const tickets: ICOATicket[] = [];
            const movieTheaters = await repos.place.searchMovieTheaters({});
            await Promise.all(movieTheaters.map(async (movieTheater) => {
                const ticketResults = await cinerino.COA.services.master.ticket({ theaterCode: movieTheater.branchCode });
                debug(movieTheater.branchCode, ticketResults.length, 'COA Tickets found');
                tickets.push(...ticketResults.map((t) => {
                    return { ...t, theaterCode: movieTheater.branchCode };
                }));
            }));

            coaTickets = tickets;
        } catch (error) {
            // no op
        }
    };
}

const USE_IN_MEMORY_OFFER_REPO = (process.env.USE_IN_MEMORY_OFFER_REPO === '1') ? true : false;
if (USE_IN_MEMORY_OFFER_REPO) {
    initializeCOATickets()({ place: new cinerino.repository.Place(mongoose.connection) })
        .then()
        // tslint:disable-next-line:no-console
        .catch(console.error);

    const HOUR = 3600000;
    setInterval(
        async () => {
            try {
                await initializeCOATickets()({ place: new cinerino.repository.Place(mongoose.connection) });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        },
        // tslint:disable-next-line:no-magic-numbers
        HOUR
    );
}

/**
 * ポイントインセンティブ名
 */
const POINT_AWARD = 'PecorinoPayment';

const placeOrderTransactionsRouter = Router();
placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        // expires is unix timestamp (in seconds)
        req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required');
        req.checkBody('sellerId', 'invalid sellerId').notEmpty().withMessage('sellerId is required');

        if (!WAITER_DISABLED) {
            req.checkBody('passportToken', 'invalid passport token')
                .notEmpty()
                .withMessage('passportToken is required');
        }

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            let passport: cinerino.factory.transaction.placeOrder.IPassportBeforeStart | undefined;
            if (!WAITER_DISABLED) {
                if (process.env.WAITER_PASSPORT_ISSUER === undefined) {
                    throw new cinerino.factory.errors.ServiceUnavailable('WAITER_PASSPORT_ISSUER undefined');
                }
                if (process.env.WAITER_SECRET === undefined) {
                    throw new cinerino.factory.errors.ServiceUnavailable('WAITER_SECRET undefined');
                }
                passport = {
                    token: <string>req.body.passportToken,
                    secret: process.env.WAITER_SECRET,
                    issuer: process.env.WAITER_PASSPORT_ISSUER
                };
            }

            const sellerRepo = new cinerino.repository.Seller(mongoose.connection);
            const seller = await sellerRepo.findById({ id: <string>req.body.sellerId });

            // パラメーターの形式をunix timestampからISO 8601フォーマットに変更したため、互換性を維持するように期限をセット
            const expires = (/^\d+$/.test(<string>req.body.expires))
                // tslint:disable-next-line:no-magic-numbers
                ? moment.unix(Number(<string>req.body.expires)).toDate()
                : moment(<string>req.body.expires).toDate();

            const transaction = await cinerino.service.transaction.placeOrderInProgress.start({
                expires: expires,
                agent: {
                    ...req.agent,
                    identifier: [
                        ...(req.agent.identifier !== undefined) ? req.agent.identifier : [],
                        ...(req.body.agent !== undefined && req.body.agent.identifier !== undefined) ? req.body.agent.identifier : []
                    ]
                },
                seller: {
                    typeOf: cinerino.factory.organizationType.MovieTheater,
                    id: <string>req.body.sellerId
                },
                object: {
                    clientUser: req.user,
                    passport: passport
                },
                passportValidator: (params: { passport: cinerino.factory.waiter.passport.IPassport }) => {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    if (process.env.WAITER_PASSPORT_ISSUER === undefined) {
                        throw new Error('WAITER_PASSPORT_ISSUER unset');
                    }
                    const issuers = process.env.WAITER_PASSPORT_ISSUER.split(',');
                    const validIssuer = issuers.indexOf(params.passport.iss) >= 0;

                    // スコープのフォーマットは、placeOrderTransaction.{sellerId}
                    const explodedScopeStrings = params.passport.scope.split('.');
                    const validScope = (
                        // tslint:disable-next-line:no-magic-numbers
                        explodedScopeStrings.length === 2 &&
                        explodedScopeStrings[0] === 'placeOrderTransaction' && // スコープ接頭辞確認
                        explodedScopeStrings[1] === seller.identifier // 販売者識別子確認
                    );

                    return validIssuer && validScope;
                }
            })({
                seller: sellerRepo,
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            // tslint:disable-next-line:no-string-literal
            // const host = req.headers['host'];
            // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
            res.json(transaction);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put(
    '/:transactionId/customerContact',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        req.checkBody('familyName').notEmpty().withMessage('required');
        req.checkBody('givenName').notEmpty().withMessage('required');
        req.checkBody('telephone').notEmpty().withMessage('required');
        req.checkBody('email').notEmpty().withMessage('required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            let formattedTelephone: string;
            try {
                const phoneUtil = PhoneNumberUtil.getInstance();
                const phoneNumber = phoneUtil.parse(<string>req.body.telephone, 'JP'); // 日本の電話番号前提仕様
                if (!phoneUtil.isValidNumber(phoneNumber)) {
                    throw new cinerino.factory.errors.Argument('contact.telephone', 'Invalid phone number format.');
                }

                formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
            } catch (error) {
                throw new cinerino.factory.errors.Argument('contact.telephone', error.message);
            }

            const contact = await cinerino.service.transaction.placeOrderInProgress.setCustomerContact({
                id: <string>req.params.transactionId,
                agent: { id: req.user.sub },
                object: {
                    customerContact: {
                        familyName: <string>req.body.familyName,
                        givenName: <string>req.body.givenName,
                        email: <string>req.body.email,
                        telephone: formattedTelephone
                    }
                }
            })({
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(CREATED).json(contact);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/seatReservation',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.offer.seatReservation4coa.create({
                object: {
                    event: { id: <string>req.body.eventIdentifier },
                    acceptedOffer: req.body.offers
                },
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId }
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                event: new cinerino.repository.Event(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                offer: (coaTickets !== undefined) ? new cinerino.repository.Offer(coaTickets) : undefined
            });

            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await cinerino.service.transaction.placeOrderInProgress.action.authorize.offer.seatReservation4coa.cancel({
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                id: <string>req.params.actionId
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予へ変更(券種変更)
 */
placeOrderTransactionsRouter.patch(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.offer.seatReservation4coa.changeOffers({
                object: {
                    event: { id: <string>req.body.eventIdentifier },
                    acceptedOffer: req.body.offers
                },
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                id: <string>req.params.actionId
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                event: new cinerino.repository.Event(mongoose.connection),
                offer: (coaTickets !== undefined) ? new cinerino.repository.Offer(coaTickets) : undefined,
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プログラムオファー承認アクション
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/offer/programMembership',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (_, res, next) => {
        try {
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 実装
            res.status(CREATED).json({});
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プログラムオファー承認アクション取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/offer/programMembership/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (_, res, next) => {
        try {
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 実装
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカード有効性チェック
 */
// placeOrderTransactionsRouter.post(
//     '/:transactionId/actions/validate/creditCard',
//     permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
//     (req, __2, next) => {
//         req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
//         req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
//         req.checkBody('method', 'invalid method').notEmpty().withMessage('method is required');
//         req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('creditCard is required');

//         next();
//     },
//     validator,
//     rateLimit4transactionInProgress,
//     async (req, res, next) => {
//         try {
//             // 会員IDを強制的にログイン中の人物IDに変更
//             type ICreditCard4authorizeAction =
//                 cinerino.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.ICreditCard4authorizeAction;
//             const creditCard: ICreditCard4authorizeAction = {
//                 ...req.body.creditCard,
//                 ...{
//                     memberId: (req.user.username !== undefined) ? req.user.username : undefined
//                 }
//             };
//             debug('authorizing credit card...', creditCard);

//             debug('authorizing credit card...', req.body.creditCard);
//             const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.check({
//                 agentId: req.user.sub,
//                 transactionId: req.params.transactionId,
//                 orderId: req.body.orderId,
//                 amount: req.body.amount,
//                 method: req.body.method,
//                 creditCard: creditCard
//             })({
//                 action: new cinerino.repository.Action(mongoose.connection),
//                 transaction: new cinerino.repository.Transaction(mongoose.connection),
//                 organization: new cinerino.repository.Seller(mongoose.connection)
//             });

//             res.status(ACCEPTED).json({
//                 id: action.id
//             });
//         } catch (error) {
//             next(error);
//         }
//     }
// );

/**
 * クレジットカードオーソリ
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/creditCard',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __2, next) => {
        req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
        req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
        req.checkBody('method', 'invalid method').notEmpty().withMessage('method is required');
        req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('creditCard is required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // 会員IDを強制的にログイン中の人物IDに変更
            type ICreditCard4authorizeAction = cinerino.factory.action.authorize.paymentMethod.creditCard.ICreditCard;
            const creditCard: ICreditCard4authorizeAction = {
                ...req.body.creditCard,
                ...{
                    memberId: (req.user.username !== undefined) ? req.user.username : undefined
                }
            };
            debug('authorizing credit card...', creditCard);

            debug('authorizing credit card...', req.body.creditCard);
            const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.create({
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                object: {
                    typeOf: cinerino.factory.paymentMethodType.CreditCard,
                    additionalProperty: req.body.additionalProperty,
                    orderId: <string>req.body.orderId,
                    amount: Number(<string>req.body.amount),
                    method: req.body.method,
                    creditCard: creditCard
                }
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                seller: new cinerino.repository.Seller(mongoose.connection)
            });

            res.status(CREATED).json({
                id: action.id
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/creditCard/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await cinerino.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.cancel({
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                id: <string>req.params.actionId
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ムビチケ追加
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/mvtk',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const authorizeObject = {
                typeOf: cinerino.factory.action.authorize.discount.mvtk.ObjectType.Mvtk,
                // tslint:disable-next-line:no-magic-numbers
                price: Number(req.body.price),
                transactionId: <string>req.params.transactionId,
                seatInfoSyncIn: {
                    kgygishCd: req.body.seatInfoSyncIn.kgygishCd,
                    yykDvcTyp: req.body.seatInfoSyncIn.yykDvcTyp,
                    trkshFlg: req.body.seatInfoSyncIn.trkshFlg,
                    kgygishSstmZskyykNo: req.body.seatInfoSyncIn.kgygishSstmZskyykNo,
                    kgygishUsrZskyykNo: req.body.seatInfoSyncIn.kgygishUsrZskyykNo,
                    jeiDt: req.body.seatInfoSyncIn.jeiDt,
                    kijYmd: req.body.seatInfoSyncIn.kijYmd,
                    stCd: req.body.seatInfoSyncIn.stCd,
                    screnCd: req.body.seatInfoSyncIn.screnCd,
                    knyknrNoInfo: req.body.seatInfoSyncIn.knyknrNoInfo,
                    zskInfo: req.body.seatInfoSyncIn.zskInfo,
                    skhnCd: req.body.seatInfoSyncIn.skhnCd
                }
            };
            const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.discount.mvtk.create({
                agentId: req.user.sub,
                transactionId: <string>req.params.transactionId,
                authorizeObject: authorizeObject
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                paymentMethod: new cinerino.repository.PaymentMethod(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(CREATED).json({
                id: action.id
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ムビチケ取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/mvtk/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await cinerino.service.transaction.placeOrderInProgress.action.authorize.discount.mvtk.cancel({
                agentId: req.user.sub,
                transactionId: <string>req.params.transactionId,
                actionId: <string>req.params.actionId
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ポイント口座確保
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/paymentMethod/pecorino',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __, next) => {
        req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required').isInt();
        req.checkBody('fromAccountNumber', 'invalid fromAccountNumber').notEmpty().withMessage('fromAccountNumber is required');
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const now = new Date();
            const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);

            // 必要な会員プログラムに加入しているかどうか確認
            const programMemberships = await ownershipInfoRepo.search<cinerino.factory.programMembership.ProgramMembershipType>({
                typeOfGood: {
                    typeOf: 'ProgramMembership'
                },
                ownedBy: { id: req.user.sub },
                ownedFrom: now,
                ownedThrough: now
            });
            const pecorinoPaymentAward = programMemberships.reduce((a, b) => [...a, ...b.typeOfGood.award], [])
                .find((a) => a === POINT_AWARD);
            if (pecorinoPaymentAward === undefined) {
                throw new cinerino.factory.errors.Forbidden('Membership program requirements not satisfied');
            }

            // pecorino転送取引サービスクライアントを生成
            const transferService = new cinerino.pecorinoapi.service.transaction.Transfer({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.account.create({
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                object: {
                    typeOf: cinerino.factory.paymentMethodType.Account,
                    amount: Number(req.body.amount),
                    currency: cinerino.factory.accountType.Point,
                    fromAccount: {
                        accountType: cinerino.factory.accountType.Point,
                        accountNumber: <string>req.body.fromAccountNumber
                    },
                    notes: <string>req.body.notes
                }
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                seller: new cinerino.repository.Seller(mongoose.connection),
                ownershipInfo: new cinerino.repository.OwnershipInfo(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                transferTransactionService: transferService
            });
            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ポイント口座承認取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/paymentMethod/pecorino/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // pecorino転送取引サービスクライアントを生成
            const transferService = new cinerino.pecorinoapi.service.transaction.Transfer({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            await cinerino.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.account.cancel({
                id: <string>req.params.actionId,
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId }
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                transferTransactionService: transferService
            });
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino賞金承認アクション
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/award/pecorino',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __2, next) => {
        req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required').isInt();
        req.checkBody('toAccountNumber', 'invalid toAccountNumber').notEmpty().withMessage('toAccountNumber is required');
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const now = new Date();
            const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);

            const programMemberships = await ownershipInfoRepo.search<cinerino.factory.programMembership.ProgramMembershipType>({
                typeOfGood: {
                    typeOf: 'ProgramMembership'
                },
                ownedBy: { id: req.user.sub },
                ownedFrom: now,
                ownedThrough: now
            });
            const pecorinoPaymentAward = programMemberships.reduce((a, b) => [...a, ...b.typeOfGood.award], [])
                .find((a) => a === POINT_AWARD);
            if (pecorinoPaymentAward === undefined) {
                throw new cinerino.factory.errors.Forbidden('Membership program requirements not satisfied');
            }

            // pecorino転送取引サービスクライアントを生成
            const depositService = new cinerino.pecorinoapi.service.transaction.Deposit({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const action = await cinerino.service.transaction.placeOrderInProgress.action.authorize.award.point.create({
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                object: {
                    amount: Number(req.body.amount),
                    toAccountNumber: <string>req.body.toAccountNumber,
                    notes: <string>req.body.notes
                }
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                ownershipInfo: new cinerino.repository.OwnershipInfo(mongoose.connection),
                depositTransactionService: depositService
            });
            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino賞金承認アクション取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/award/pecorino/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const depositService = new cinerino.pecorinoapi.service.transaction.Deposit({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            await cinerino.service.transaction.placeOrderInProgress.action.authorize.award.point.cancel({
                agent: { id: req.user.sub },
                transaction: { id: <string>req.params.transactionId },
                id: <string>req.params.actionId
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                depositTransactionService: depositService
            });
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const orderDate = new Date();
            const { order } = await cinerino.service.transaction.placeOrderInProgress.confirm({
                id: <string>req.params.transactionId,
                agent: { id: req.user.sub },
                result: {
                    order: {
                        orderDate: orderDate,
                        confirmationNumber: (params) => {
                            const firstOffer = params.acceptedOffers[0];

                            // COAに適合させるため、座席予約の場合、確認番号をCOA予約番号に強制変換
                            if (firstOffer !== undefined
                                && firstOffer.itemOffered.typeOf === cinerino.factory.chevre.reservationType.EventReservation) {
                                return Number(firstOffer.itemOffered.reservationNumber);
                            } else {
                                return params.confirmationNumber;
                            }
                        }
                    }
                },
                options: {
                    ...req.body,
                    sendEmailMessage: (req.body.sendEmailMessage === true) ? true : false
                }
            })({
                action: new cinerino.repository.Action(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection),
                orderNumber: new cinerino.repository.OrderNumber(redis.getClient()),
                seller: new cinerino.repository.Seller(mongoose.connection)
            });
            debug('transaction confirmed', order);

            // 非同期でタスクエクスポート(APIレスポンスタイムに影響を与えないように)
            // tslint:disable-next-line:no-floating-promises
            cinerino.service.transaction.placeOrder.exportTasks(cinerino.factory.transactionStatusType.Confirmed)({
                task: new cinerino.repository.Task(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(CREATED).json(order);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引を明示的に中止
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/cancel',
    permitScopes(['admin', 'aws.cognito.signin.user.admin', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new cinerino.repository.Transaction(mongoose.connection);
            await transactionRepo.cancel({
                typeOf: cinerino.factory.transactionType.PlaceOrder,
                id: <string>req.params.transactionId
            });
            debug('transaction canceled.');
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/tasks/sendEmailNotification',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            const task = await cinerino.service.transaction.placeOrder.sendEmail(
                <string>req.params.transactionId,
                {
                    typeOf: cinerino.factory.creativeWorkType.EmailMessage,
                    sender: {
                        name: req.body.sender.name,
                        email: req.body.sender.email
                    },
                    toRecipient: {
                        name: req.body.toRecipient.name,
                        email: req.body.toRecipient.email
                    },
                    about: req.body.about,
                    text: req.body.text
                }
            )({
                task: new cinerino.repository.Task(mongoose.connection),
                transaction: new cinerino.repository.Transaction(mongoose.connection)
            });

            res.status(CREATED).json(task);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引検索
 */
placeOrderTransactionsRouter.get(
    '',
    permitScopes(['admin']),
    ...[
        query('startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('endThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new cinerino.repository.Transaction(mongoose.connection);
            const searchConditions: cinerino.factory.transaction.ISearchConditions<cinerino.factory.transactionType.PlaceOrder> = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                typeOf: cinerino.factory.transactionType.PlaceOrder
            };
            const transactions = await transactionRepo.search(searchConditions);
            const totalCount = await transactionRepo.count(searchConditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(transactions);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引に対するアクション検索
 */
placeOrderTransactionsRouter.get(
    '/:transactionId/actions',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const actionRepo = new cinerino.repository.Action(mongoose.connection);
            const actions = await actionRepo.searchByPurpose({
                purpose: {
                    typeOf: cinerino.factory.transactionType.PlaceOrder,
                    id: <string>req.params.transactionId
                },
                sort: req.query.sort
            });
            res.json(actions);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引レポート
 */
placeOrderTransactionsRouter.get(
    '/report',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new cinerino.repository.Transaction(mongoose.connection);
            const searchConditions: cinerino.factory.transaction.ISearchConditions<cinerino.factory.transactionType.PlaceOrder> = {
                limit: undefined,
                page: undefined,
                typeOf: cinerino.factory.transactionType.PlaceOrder,
                ids: (Array.isArray(req.query.ids)) ? req.query.ids : undefined,
                statuses: (Array.isArray(req.query.statuses)) ? req.query.statuses : undefined,
                startFrom: (req.query.startFrom !== undefined) ? moment(req.query.startFrom)
                    .toDate() : undefined,
                startThrough: (req.query.startThrough !== undefined) ? moment(req.query.startThrough)
                    .toDate() : undefined,
                endFrom: (req.query.endFrom !== undefined) ? moment(req.query.endFrom)
                    .toDate() : undefined,
                endThrough: (req.query.endThrough !== undefined) ? moment(req.query.endThrough)
                    .toDate() : undefined,
                agent: req.query.agent,
                seller: req.query.seller,
                object: req.query.object,
                result: req.query.result
            };
            const stream = await cinerino.service.report.transaction.download({
                conditions: searchConditions,
                format: req.query.format
            })({ transaction: transactionRepo });
            res.type(`${req.query.format}; charset=utf-8`);
            stream.pipe(res);
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
