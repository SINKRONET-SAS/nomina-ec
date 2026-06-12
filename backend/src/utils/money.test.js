const { roundMoney, toMoneyString } = require('./money');

describe('money', () => {
  test('redondea a dos decimales', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(toMoneyString(10)).toBe('10.00');
  });

  test('rechaza valores invalidos', () => {
    expect(() => roundMoney(Number.NaN)).toThrow('Valor monetario invalido');
  });
});
