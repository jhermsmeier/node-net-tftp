var TFTP = require( '../tftp' )

class ErrorPacket {

  constructor( code, message ) {
    this.opcode = TFTP.OPCODE.ERR
    this.code = code ?? TFTP.ERROR.UNDEFINED
    this.message = message ?? ErrorPacket.getMessage( this.code )
  }

  static getMessage( code ) {
    return Object.hasOwn( TFTP.ERROR_MESSAGE, code )
      ? TFTP.ERROR_MESSAGE[ code ]
      : TFTP.ERROR_MESSAGE[ TFTP.ERROR.UNDEFINED ]
  }

  static encodingLength( error ) {
    return 2 + 2 + Buffer.byteLength( error.message, 'ascii' ) + 1
  }

  static encode( buffer, error, offset ) {

    if( typeof error.message != 'string' ) {
      throw new TypeError( 'Error message must be a string' )
    }

    if( !Number.isInteger( error.code ) || error.code < 0 ) {
      throw new TypeError( 'Error code must be a positive integer' )
    }

    var messageLength = Buffer.byteLength( error.message, 'ascii' )

    offset = offset ?? 0

    offset = buffer.writeUInt16BE( TFTP.OPCODE.ERR, offset )
    offset = buffer.writeUInt16BE( error.code, offset )
    offset += buffer.write( error.message, offset, messageLength, 'ascii' )
    offset = buffer.writeUInt8( 0, offset )

    return offset

  }

  static decode( buffer, offset, length ) {

    offset = offset ?? 0
    length = length ?? ( buffer.length - offset )

    var end = length != null
      ? offset + length
      : buffer.length

    if( length < 5 ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed ERROR packet: Packet too small' )
    }

    var opcode = buffer.readUInt16BE( offset + 0 )
    if( opcode != TFTP.OPCODE.ERR ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed ERROR packet: Invalid opcode' )
    }

    var errorCode = buffer.readUInt16BE( offset + 2 )

    var eod = buffer.indexOf( 0x00, offset + 4 )
    if( eod == -1 || eod > end ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed ERROR packet: No end of message' )
    }

    var errorMessage = buffer.toString( 'utf8', offset + 4, eod )

    return new ErrorPacket( errorCode, errorMessage )

  }

}

module.exports = ErrorPacket
