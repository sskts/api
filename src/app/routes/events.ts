/**
 * イベントルーター
 */
import * as cinerino from '@cinerino/domain';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import * as mongoose from 'mongoose';

import * as redis from '../../redis';
import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const eventsRouter = Router();
eventsRouter.use(authentication);

/**
 * @deprecated Use /screeningEvent/:id
 */
eventsRouter.get(
    '/individualScreeningEvent/:id',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            await cinerino.service.offer.findScreeningEventById4cinemasunshine(<string>req.params.id)({
                event: new cinerino.repository.Event(mongoose.connection),
                itemAvailability: new cinerino.repository.itemAvailability.ScreeningEvent(redis.getClient())
            }).then((event) => {
                res.json(event);
            });
        } catch (error) {
            next(error);
        }
    });

/**
 * @deprecated Use /screeningEvent
 */
eventsRouter.get(
    '/individualScreeningEvent',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    ...[
        query('startFrom').optional().isISO8601().toDate(),
        query('startThrough').optional().isISO8601().toDate(),
        query('endFrom').optional().isISO8601().toDate(),
        query('endThrough').optional().isISO8601().toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const eventRepo = new cinerino.repository.Event(mongoose.connection);
            const itemAvailabilityRepo = new cinerino.repository.itemAvailability.ScreeningEvent(redis.getClient());

            const searchConditions: cinerino.factory.event.screeningEvent.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : undefined,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : undefined,
                sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: cinerino.factory.sortType.Ascending }
            };
            const events = await cinerino.service.offer.searchScreeningEvents4cinemasunshine(searchConditions)({
                event: eventRepo,
                itemAvailability: itemAvailabilityRepo
            });
            const totalCount = await eventRepo.countIndividualScreeningEvents(searchConditions);

            res.set('X-Total-Count', totalCount.toString());
            res.json(events);
        } catch (error) {
            next(error);
        }
    }
);

eventsRouter.get(
    '/screeningEvent/:id',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            await cinerino.service.offer.findScreeningEventById4cinemasunshine(<string>req.params.id)({
                event: new cinerino.repository.Event(mongoose.connection),
                itemAvailability: new cinerino.repository.itemAvailability.ScreeningEvent(redis.getClient())
            }).then((event) => {
                res.json(event);
            });
        } catch (error) {
            next(error);
        }
    });

eventsRouter.get(
    '/screeningEvent',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    ...[
        query('startFrom').optional().isISO8601().toDate(),
        query('startThrough').optional().isISO8601().toDate(),
        query('endFrom').optional().isISO8601().toDate(),
        query('endThrough').optional().isISO8601().toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const eventRepo = new cinerino.repository.Event(mongoose.connection);
            const itemAvailabilityRepo = new cinerino.repository.itemAvailability.ScreeningEvent(redis.getClient());

            const searchConditions: cinerino.factory.event.screeningEvent.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : undefined,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : undefined
            };
            const events = await cinerino.service.offer.searchScreeningEvents4cinemasunshine(searchConditions)({
                event: eventRepo,
                itemAvailability: itemAvailabilityRepo
            });
            const totalCount = await eventRepo.countIndividualScreeningEvents(searchConditions);

            res.set('X-Total-Count', totalCount.toString());
            res.json(events);
        } catch (error) {
            next(error);
        }
    }
);

export default eventsRouter;
