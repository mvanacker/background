import React from 'react';

import { PanelTitle } from '../common/Panel';

import { TableContainer, Table, DeleteButton } from './Common';

export default ({ deribit, orders, ...props }) => {
  // Sorting of contracts by amount of orders on them
  const amount = (future) => Object.keys(orders[future]).length;
  const byAmount = (a, b) => amount(b) - amount(a);

  // Sorting of orders by price
  const price = (o) => (o.order_type === 'limit' ? o.price : o.stop_price);
  const byPrice = (a, b) => price(b) - price(a);

  // Cancellation handlers
  const cancelAll = () => {
    deribit.send({
      method: 'private/cancel_all_by_currency',
      params: { currency: 'btc' },
    });
  };

  const cancelByInstrument = (instrument_name) => () => {
    deribit.send({
      method: 'private/cancel_all_by_instrument',
      params: { instrument_name },
    });
  };

  const cancelByLabel = (label) => () => {
    deribit.send({
      method: 'private/cancel_by_label',
      params: { label },
    });
  };

  const cancel = (order_id) => () => {
    deribit.send({
      method: 'private/cancel',
      params: { order_id },
    });
  };

  return (
    <div className="w3-center" {...props}>
      <PanelTitle>
        Open Orders
        <DeleteButton onClick={cancelAll} />
      </PanelTitle>
      <div className="my-order-tables">
        {Object.keys(orders).every((future) => amount(future) === 0) && (
          <i>No open orders.</i>
        )}
        {Object.keys(orders)
          .filter((future) => amount(future) > 0)
          .sort(byAmount)
          .map((future) => (
            <div key={future}>
              <h4>
                {future}
                {amount(future) > 0 && (
                  <DeleteButton
                    onClick={cancelByInstrument(future)}
                    className="my-order-table-delete-instrument"
                  />
                )}
              </h4>
              <OrderTable className="w3-theme-d2">
                <thead>
                  <tr>
                    <th>label</th>
                    <th>price</th>
                    <th>amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(orders[future])
                    .sort(byPrice)
                    .map(
                      ({
                        order_id,
                        label,
                        direction,
                        order_type,
                        stop_price,
                        price,
                        filled_amount,
                        amount,
                        // reduce_only,
                      }) => (
                        <tr
                          key={order_id}
                          className={`w3-hover-l1 ${
                            direction === 'buy' ? 'my-text-lime' : 'my-text-red'
                          }`}
                        >
                          <td>
                            {order_type === 'stop_market' &&
                              (direction === 'buy' ? (
                                <StopIcon
                                  className="my-text-lime"
                                  title="Buy Stop"
                                />
                              ) : (
                                <StopIcon
                                  className="my-text-red"
                                  title="Sell Stop"
                                />
                              ))}
                            {label}
                            <DeleteButton onClick={cancelByLabel(label)} />
                          </td>
                          {order_type === 'stop_market' ? (
                            <>
                              <td>{stop_price}</td>
                              <td>{amount}</td>
                            </>
                          ) : (
                            <>
                              <td>{price}</td>
                              <td>
                                {filled_amount}/{amount}
                              </td>
                            </>
                          )}
                          {/* <td className="w3-center">
                            <TextButton>🖉</TextButton>
                          </td> */}
                          <td>
                            <DeleteButton onClick={cancel(order_id)} />
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </OrderTable>
            </div>
          ))}
      </div>
    </div>
  );
};

const StopIcon = ({ className = '', ...props }) => (
  <i className={`fas fa-hand-paper my-margin-lr ${className}`} {...props} />
);

const OrderTable = ({ children, ...props }) => (
  <TableContainer {...props}>
    <Table>{children}</Table>
  </TableContainer>
);
