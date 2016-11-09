let expect = require('chai').expect

let datafire = require('../index');

describe('Flows', () => {
  it('should run', () => {
    let flow = new datafire.Flow('test', 'test_flow');
    expect(flow).to.not.be.null;
  })
})

