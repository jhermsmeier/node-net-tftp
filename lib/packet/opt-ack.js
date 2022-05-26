var TFTP = require( '../tftp' )

class OckPacket {

  constructor( blockNumber, options ) {
    this.opcode = TFTP.OPCODE.OCK
    this.blockNumber = blockNumber ?? 0
    // RFC 2347, RFC 2348
    this.blocksize = options?.blocksize
    // RFC 2347, RFC 2349
    this.size = options?.size
    this.timeout = options?.timeout
  }

  static encodingLength() {
    return 4
  }

  static encodeField( buffer, field, value, offset ) {
    return offset + buffer.write( 'ascii', `${field}\x00${value}\x00`, offset )
  }

  static encode( buffer, blockNumber, offset ) {

    if( !Number.isInteger( blockNumber ) ) {
      throw new TypeError( 'Block number must be a positive integer' )
    }

    offset = offset ?? 0

    offset = buffer.writeUInt16BE( TFTP.OPCODE.ACK, offset )
    offset = buffer.writeUInt16BE( blockNumber, offset )

    if( this.blocksize != null )
      offset = OckPacket.encodeField( buffer, TFTP.OPTION.BLOCK_SIZE, this.blocksize, offset )
    if( this.size != null )
      offset = OckPacket.encodeField( buffer, TFTP.OPTION.TRANSFER_SIZE, this.size, offset )
    if( this.timeout != null )
      offset = OckPacket.encodeField( buffer, TFTP.OPTION.TIMEOUT, this.timeout, offset )

    return offset

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
    var packet = new OckPacket()

    packet.opcode = buffer.readUInt16BE( offset + 0 )
    if( packet.opcode != TFTP.OPCODE.ACK ) {
      throw new TFTP.Error( TFTP.ERROR.UNDEFINED, 'Malformed ACK packet: Invalid opcode' )
    }

    packet.blockNumber = buffer.readUInt16BE( offset + 2 )

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

    return new OckPacket( blockNumber )

  }

}

module.exports = OckPacket
