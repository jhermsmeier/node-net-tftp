var TFTP = require( '../tftp' )

class DataPacket {

  constructor( blockNumber, dataBuffer ) {
    this.opcode = TFTP.OPCODE.DAT
    this.blockNumber = blockNumber ?? 0
    this.buffer = dataBuffer ?? null
  }

  static encodingLength( buffer ) {
    return 4 + buffer.length
  }

  static encode( buffer, blockNumber, dataBuffer, offset, dataStart, dataEnd ) {

    if( !Number.isInteger( blockNumber ) ) {
      throw new TypeError( 'Block number must be a positive integer' )
    }

    if( !Buffer.isBuffer( dataBuffer ) ) {
      throw new TypeError( 'Data must be a buffer' )
    }

    offset = offset ?? 0
    dataStart = dataStart ?? 0
    dataEnd = dataEnd ?? dataBuffer.length

    if(( dataEnd - dataStart ) > 512 ) {
      throw new Error( `Data buffer too large (${ dataEnd - dataStart })` )
    }

    offset = buffer.writeUInt16BE( TFTP.OPCODE.DAT, offset )
    offset = buffer.writeUInt16BE( blockNumber, offset )
    offset += dataBuffer.copy( buffer, offset, dataStart, dataEnd )

    return offset

  }

  static decode( buffer, offset, length ) {

    offset = offset ?? 0
    length = length ?? ( buffer.length - offset )

    if( length < 4 ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed DATA packet: Packet too small' )
    }

    var end = length != null
      ? offset + length
      : buffer.length

    var opcode = buffer.readUInt16BE( offset + 0 )
    if( opcode != TFTP.OPCODE.DAT ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed DATA packet: Invalid opcode' )
    }

    var blockNumber = buffer.readUInt16BE( offset + 2 )
    var dataBuffer = Buffer.alloc( length - 4 )

    buffer.copy( dataBuffer, 0, offset + 4, end )

    return new DataPacket( blockNumber, dataBuffer )

  }

}

module.exports = DataPacket
