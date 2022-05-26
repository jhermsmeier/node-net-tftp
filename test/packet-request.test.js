var assert = require( 'assert' )
var RequestPacket = require( '../lib/packet/request' )

context( 'RequestPacket', () => {

  test( 'decodes read request', () => {

    var input = Buffer.from( '\x00\x01filename.ext\x00netascii\x00' )
    var result = RequestPacket.decode( input )

    assert.deepEqual( result, {
      opcode: 1,
      filename: 'filename.ext',
      mode: 'netascii',
      timeout: undefined,
      size: undefined,
      blocksize: undefined,
    })

  })

  test( 'decodes write request', () => {

    var input = Buffer.from( '\x00\x02filename.ext\x00octet\x00' )
    var result = RequestPacket.decode( input )

    assert.deepEqual( result, {
      opcode: 2,
      filename: 'filename.ext',
      mode: 'octet',
      timeout: undefined,
      size: undefined,
      blocksize: undefined,
    })

  })

  context( 'RFC 2347, 2348, 2349', () => {

    test( 'decodes timeout option', () => {
      // | opcode | filename | 0 | mode | 0 | timeout | 0 | #secs | 0 |
      var input = Buffer.from( '\x00\x02filename.ext\x00octet\x00timeout\x0025\x00' )
      var result = RequestPacket.decode( input )

      assert.deepEqual( result, {
        opcode: 2,
        filename: 'filename.ext',
        mode: 'octet',
        timeout: 25000,
        size: undefined,
        blocksize: undefined,
      })

    })

    test( 'decodes transfer size option', () => {
      // | opcode | filename | 0 | mode | 0 | timeout | 0 | #secs | 0 |
      var input = Buffer.from( '\x00\x02filename.ext\x00octet\x00tsize\x00746252\x00' )
      var result = RequestPacket.decode( input )

      assert.deepEqual( result, {
        opcode: 2,
        filename: 'filename.ext',
        mode: 'octet',
        size: 746252n,
        timeout: undefined,
        blocksize: undefined,
      })

    })

    test( 'decodes transfer size and timeout options', () => {
      // | opcode | filename | 0 | mode | 0 | timeout | 0 | #secs | 0 |
      var input = Buffer.from( '\x00\x02filename.ext\x00octet\x00tsize\x00746252\x00timeout\x0032\x00' )
      var result = RequestPacket.decode( input )

      assert.deepEqual( result, {
        opcode: 2,
        filename: 'filename.ext',
        mode: 'octet',
        size: 746252n,
        timeout: 32000,
        blocksize: undefined,
      })

    })

    test( 'decodes block size, transfer size, and timeout options', () => {
      // | opcode | filename | 0 | mode | 0 | timeout | 0 | #secs | 0 |
      var input = Buffer.from( '\x00\x02filename.ext\x00octet\x00blksize\x001024\x00tsize\x00746252\x00timeout\x0032\x00' )
      var result = RequestPacket.decode( input )

      assert.deepEqual( result, {
        opcode: 2,
        filename: 'filename.ext',
        mode: 'octet',
        size: 746252n,
        timeout: 32000,
        blocksize: 1024,
      })

    })

  })

})
