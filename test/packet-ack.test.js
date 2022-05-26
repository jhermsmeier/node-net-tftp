var assert = require( 'assert' )
var AckPacket = require( '../lib/packet/ack' )

context( 'AckPacket', () => {

  test( 'decodes packet', () => {

    var input = Buffer.from( '\x00\x04\x00\x01' )
    var result = AckPacket.decode( input )

    assert.deepEqual( result, {
      opcode: 4,
      blockNumber: 1
    })

  })

})
