/**
 * 自分のクレジットカードルーター
 */
import * as cinerino from '@cinerino/domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';

import permitScopes from '../../../../middlewares/permitScopes';
import validator from '../../../../middlewares/validator';

const creditCardsRouter = Router();

const debug = createDebug('cinerino-api:router');

/**
 * 会員クレジットカード追加
 */
creditCardsRouter.post(
    '',
    permitScopes(['aws.cognito.signin.user.admin']),
    (__1, __2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const creditCard = await cinerino.service.person.creditCard.save(<string>req.user.username, req.body)();
            res.status(CREATED)
                .json(creditCard);
        } catch (error) {
            next(error);
        }
    }
);
/**
 * 会員クレジットカード検索
 */
creditCardsRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin']),
    async (req, res, next) => {
        try {
            const searchCardResults = await cinerino.service.person.creditCard.find(<string>req.user.username)();
            debug('searchCardResults:', searchCardResults);
            res.json(searchCardResults);
        } catch (error) {
            next(error);
        }
    }
);
/**
 * 会員クレジットカード削除
 */
creditCardsRouter.delete(
    '/:cardSeq',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            await cinerino.service.person.creditCard.unsubscribe(<string>req.user.username, req.params.cardSeq)();
            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);
export default creditCardsRouter;
