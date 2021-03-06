/**
 * 非同期ジョブ
 */
import abortTasks from './continuous/abortTasks/run';
import cancelAccount from './continuous/cancelAccount/run';
import cancelCreditCard from './continuous/cancelCreditCard/run';
import cancelPointAward from './continuous/cancelPointAward/run';
import cancelSeatReservation from './continuous/cancelSeatReservation/run';
import confirmReservation from './continuous/confirmReservation/run';
import givePointAward from './continuous/givePointAward/run';
import importScreeningEvents from './continuous/importScreeningEvents/run';
import makeTransactionExpired from './continuous/makeTransactionExpired/run';
import onCanceledPlaceOrder from './continuous/onCanceledPlaceOrder/run';
import onCanceledReturnOrder from './continuous/onCanceledReturnOrder/run';
import onConfirmedPlaceOrder from './continuous/onConfirmedPlaceOrder/run';
import onConfirmedReturnOrder from './continuous/onConfirmedReturnOrder/run';
import onExpiredPlaceOrder from './continuous/onExpiredPlaceOrder/run';
import onExpiredReturnOrder from './continuous/onExpiredReturnOrder/run';
import payAccount from './continuous/payAccount/run';
import payCreditCard from './continuous/payCreditCard/run';
import placeOrder from './continuous/placeOrder/run';
import reexportTransactionTasks from './continuous/reexportTransactionTasks/run';
import refundAccount from './continuous/refundAccount/run';
import refundCreditCard from './continuous/refundCreditCard/run';
import registerProgramMembership from './continuous/registerProgramMembership/run';
import retryTasks from './continuous/retryTasks/run';
import returnOrder from './continuous/returnOrder/run';
import returnPointAward from './continuous/returnPointAward/run';
import sendEmailMessage from './continuous/sendEmailMessage/run';
import sendOrder from './continuous/sendOrder/run';
import triggerWebhook from './continuous/triggerWebhook/run';
import unRegisterProgramMembership from './continuous/unRegisterProgramMembership/run';

import createImportScreeningEventsTask from './triggered/createImportScreeningEventsTask/run';
// import importMovies from './triggered/importMovies/run';
import importMovieTheaters from './triggered/importMovieTheaters/run';
import updateScreeningEventAvailability from './triggered/updateScreeningEventAvailability/run';

export default async () => {
    await abortTasks();
    await cancelAccount();
    await cancelCreditCard();
    await cancelPointAward();
    await cancelSeatReservation();
    await confirmReservation();
    await givePointAward();
    await importScreeningEvents();
    await makeTransactionExpired();
    await onCanceledPlaceOrder();
    await onCanceledReturnOrder();
    await onConfirmedPlaceOrder();
    await onConfirmedReturnOrder();
    await onExpiredPlaceOrder();
    await onExpiredReturnOrder();
    await payAccount();
    await payCreditCard();
    await placeOrder();
    await reexportTransactionTasks();
    await refundAccount();
    await refundCreditCard();
    await registerProgramMembership();
    await retryTasks();
    await returnOrder();
    await returnPointAward();
    await sendEmailMessage();
    await sendOrder();
    await triggerWebhook();
    await unRegisterProgramMembership();

    await createImportScreeningEventsTask();
    // await importMovies();
    await importMovieTheaters();
    await updateScreeningEventAvailability();
};
