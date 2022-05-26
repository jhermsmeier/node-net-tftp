var TFTP = require( '../tftp' )

class RequestPacket {

  constructor( opcode, filename, mode, options ) {
    this.opcode = opcode ?? 0
    this.filename = filename ?? ''
    this.mode = mode ?? ''
    // RFC 2347, RFC 2348
    this.blocksize = options?.blocksize
    // RFC 2347, RFC 2349
    this.size = options?.size
    this.timeout = options?.timeout
  }

  static encodingLength( req ) {
    return 2 + Buffer.byteLength( req.filename, 'ascii' ) + 1
      + Buffer.byteLength( req.mode, 'ascii' ) + 1
  }

  static encode( buffer, req, offset ) {
    throw new Error( 'Not implemented' )
  }

  static readField( buffer, offset, end ) {
    var eof = buffer.indexOf( 0x00, offset )
    if( eof == -1 || eof > end ) return [ -1, null ]
    return [ eof + 1, buffer.toString( 'ascii', offset, eof ) ]
  }

  static decode( buffer, offset, length ) {

    offset = offset ?? 0
    length = length ?? ( buffer.length - offset )

    var end = offset + length
    var packet = new RequestPacket()

    if( length < 6 ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed RRQ/WRQ packet: Packet too small' )
    }

    packet.opcode = buffer.readUInt16BE( offset + 0 )

    if( packet.opcode != TFTP.OPCODE.RRQ && packet.opcode != TFTP.OPCODE.WRQ ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed RRQ/WRQ packet: Invalid opcode' )
    }

    offset = offset + 2

    var [ offset, filename ] = RequestPacket.readField( buffer, offset )
    if( offset == -1 ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed RRQ/WRQ packet: Invalid filename' )
    }

    var [ offset, mode ] = RequestPacket.readField( buffer, offset )
    if( offset == -1 ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed RRQ/WRQ packet: Invalid mode' )
    }

    packet.filename = filename
    packet.mode = mode

    while( offset < end ) {

      var [ offset, field ] = RequestPacket.readField( buffer, offset )
      if( offset == -1 ) break;

      var [ offset, value ] = RequestPacket.readField( buffer, offset )
      if( offset == -1 ) break;

      switch( field.toLowerCase() ) {
        case TFTP.OPTION.BLOCK_SIZE: packet.blocksize = Number( value ); break
        case TFTP.OPTION.TIMEOUT: packet.timeout = Number( value ) * 1000; break
        case TFTP.OPTION.TRANSFER_SIZE: packet.size = BigInt( value ); break
      }

    }

    return packet

  }

}

module.exports = RequestPacket
