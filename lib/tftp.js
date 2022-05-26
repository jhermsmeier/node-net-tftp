var TFTP = module.exports

TFTP.PORT = 69
TFTP.INITIAL_BLOCK_NO = 1
TFTP.BLOCK_SIZE = 512
TFTP.PACKET_SIZE = 2 + 2 + TFTP.BLOCK_SIZE

TFTP.SOCKET_TIMEOUT = 25_000
TFTP.TX_TIMEOUT = 5_000

/**
 * TFTP Opcodes
 * @enum {Number}
 */
TFTP.OPCODE = {
  /** @type {Number} Read request */
  RRQ: 1,
  /** @type {Number} Write request */
  WRQ: 2,
  /** @type {Number} Data packet */
  DAT: 3,
  /** @type {Number} Acknowledgement */
  ACK: 4,
  /** @type {Number} Error */
  ERR: 5,
  /** @type {Number} Option Acknowledgment */
  OCK: 8,
}

TFTP.MODE = {
  ASCII: 'netascii',
  OCTET: 'octet',
  MAIL: 'mail',
}

TFTP.OPTION = {
  // RFC 1350
  FILENAME: 'filename',
  MODE: 'mode',
  // RFC 2348
  BLOCK_SIZE: 'blksize',
  // RFC 2349
  TIMEOUT: 'timeout',
  TRANSFER_SIZE: 'tsize',
}

TFTP.ERROR = {
  UNDEFINED: 0,
  NOT_FOUND: 1,
  ACCESS_VIOLATION: 2,
  ALLOCATION_FAILED: 3,
  ILLEGAL: 4,
  UNKNOWN_TRANSFER: 5,
  FILE_EXISTS: 6,
  UNKNOWN_USER: 7,
  OPTION_FAIL: 8,
}

TFTP.ERROR_MESSAGE = {
  0: 'Undefined Error',
  1: 'Not Found',
  2: 'Access Violation',
  3: 'Allocation Failed',
  4: 'Illegal Operation',
  5: 'Unknown Transfer ID',
  6: 'File Exists',
  7: 'Unknown User',
  8: 'Option Negotiation Failure',
}

TFTP.Packet = {

  Ack: require( './packet/ack' ),
  OptAck: require( './packet/opt-ack' ),
  Data: require( './packet/data' ),
  Error: require( './packet/error' ),
  Request: require( './packet/request' ),

  decode( buffer, offset, length ) {
    var opcode = buffer.readUInt16BE( offset ?? 0 )
    switch( opcode ) {
      case TFTP.OPCODE.RRQ:
      case TFTP.OPCODE.WRQ: return TFTP.Packet.Request.decode( buffer, offset, length )
      case TFTP.OPCODE.ACK: return TFTP.Packet.Ack.decode( buffer, offset, length )
      case TFTP.OPCODE.OCK: return TFTP.Packet.OptAck.decode( buffer, offset, length )
      case TFTP.OPCODE.ERR: return TFTP.Packet.Error.decode( buffer, offset, length )
      case TFTP.OPCODE.DAT: return TFTP.Packet.Data.decode( buffer, offset, length )
      default:
        throw new Error( `Unknown opcode "${opcode}"` )
    }
  },

}

TFTP.Error = require( './error' )
TFTP.Server = require( './server' )
