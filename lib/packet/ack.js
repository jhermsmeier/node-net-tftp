var TFTP = require( '../tftp' )

class AckPacket {

  constructor( blockNumber ) {
    this.opcode = TFTP.OPCODE.ACK
    this.blockNumber = blockNumber ?? 0
  }

  static encodingLength() {
    return 4
  }

  static encode( buffer, blockNumber, offset ) {

    if( !Number.isInteger( blockNumber ) ) {
      throw new TypeError( 'Block number must be a positive integer' )
    }

    offset = offset ?? 0

    offset = buffer.writeUInt16BE( TFTP.OPCODE.ACK, offset )
    offset = buffer.writeUInt16BE( blockNumber, offset )

    return offset

  }

  static decode( buffer, offset, length ) {

    offset = offset ?? 0

    var end = length != null
      ? offset + length
      : buffer.length

    var opcode = buffer.readUInt16BE( offset + 0 )
    if( opcode != TFTP.OPCODE.ACK ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed ACK packet: Invalid opcode' )
    }

    var blockNumber = buffer.readUInt16BE( offset + 2 )

    return new AckPacket( blockNumber )

  }

}

module.exports = AckPacket
