var UDP = require( 'dgram' )
var EventEmitter = require( 'events' )
var stream = require( 'stream' )
var TFTP = require( '../tftp' )

class Transfer extends EventEmitter {

  constructor( options ) {

    super( options )

    /** @type {Number} Transfer ID */
    this.id = null
    /** @type {TFTP.Packet.Request} Request packet */
    this.request = options.request
    /** @type {Object} Source address (this socket) */
    this.local = {
      address: options.address,
      family: options.family,
      port: null,
    }
    /** @type {Object} Destination address (remote) */
    this.remote = {
      address: options.remote.address,
      family: options.remote.family,
      port: options.remote.port,
    }
    /** @type {Number} Datagram packet TTL */
    this.packetTtl = options.ttl
    /** @type {dgram.Socket} Socket */
    this.socket = null
    /** @type {Boolean} Whether this transfer has been destroyed */
    this.destroyed = false
    /** @type {Boolean} Whether this transfer has ended */
    this.ended = false

    this.socketTimeout = options.socketTimeout ?? TFTP.SOCKET_TIMEOUT
    this.txTimeout = options.txTimeout ?? TFTP.TX_TIMEOUT

    this.blockNumber = 1
    this.packetBuffer = null

  }

  open( callback ) {

    var type = this.local.family == 'IPv6' ? 'udp6' : 'udp4'

    this.socket = UDP.createSocket( type )
    this.socket.bind( null, this.local.address, ( error ) => {

      if( error != null ) {
        return void callback.call( this, error )
      }

      if( this.packetTtl != null ) {
        this.socket.setTTL( this.packetTtl )
      }

      this.id = `[${this.remote.address}]:${this.remote.port}`

      var localAddr = this.socket.address()

      this.local.address = localAddr.address
      this.local.family = localAddr.family
      this.local.port = localAddr.port

      this.socket.on( 'message', ( msg, remote ) => this.onMessage( msg, remote ))

      this.socket.on( 'error', ( error ) => {
        this.destroy( error )
      })

      this.socket.on( 'close', () => {
        this.socket = null
        this.emit( 'close', this.destroyed )
      })

      callback.call( this, null )

    })

  }

  onAck( packet, remote ) {

    // We shouldn't be getting any ACK packets when servicing a write request
    if( this.request.opcode == TFTP.OPCODE.WRQ ) {
      var error = new TFTP.Error( TFTP.ERROR.ILLEGAL_OPERATION )
      return this.destroy( error )
    }

    if( packet.blockNumber == this.blockNumber - 1 ) {
      if( this.ended ) this.close()
      else this._onReadable()
    }

  }

  onData( packet, remote ) {

    // We shouldn't be getting any DATA packets when servicing a read request
    if( this.request.opcode == TFTP.OPCODE.RRQ ) {
      return this.error( TFTP.ERROR.ILLEGAL_OPERATION, 'Unexpected DATA packet' )
    }

    // Since TFTP operates in lockstep, if we see a "future" packet,
    // something's gone wrong, and we should abort the transfer
    if( packet.blockNumber > this.blockNumber + 1 ) {
      return this.error( TFTP.ERROR.ILLEGAL_OPERATION, 'Out of sequence DATA packet block number' )
    }

    // NOTE: In theory it should be fine to accept data chunks larger than 512 bytes
    // TODO: Check whether larger data packets are being used in practice
    if( remote.size > TFTP.PACKET_SIZE ) {
      return this.error( TFTP.ERROR.ALLOCATION_FAILED, 'DATA packet too large' )
    }

    // If the write request has not yet been accepted,
    // reject and abort the transfer
    if( this.stream == null ) {
      return this.error( TFTP.ERROR.ILLEGAL_OPERATION, 'Write to unacknowledged transfer' )
    }

    // Just ACK the packet again,
    // since we've seen this DATA packet already
    if( packet.blockNumber < this.blockNumber ) {
      return this.ack( packet.blockNumber )
    }

    this.stream.write( packet.buffer )
    this.blockNumber = packet.blockNumber
    this.ack( this.blockNumber, () => {
      if( this.ended ) this.close()
    })

    if( packet.buffer.length < 512 ) {
      this.ended = true
      this.stream.end()
    }

  }

  onMessage( msg, remote ) {

    var packet = null
    try {
      packet = TFTP.Packet.decode( msg, 0, remote.size )
    } catch( error ) {
      return this.destroy( error )
    }

    // console.log( 'transfer:packet', packet )

    // Don't handle any packets after destruction,
    // or after the transfer has ended
    if( this.destroyed ) {
      return
    }

    // Whether this packet originated from the address that initialized the transfer
    var isValidRemote = remote.port == this.remote.port &&
      remote.address == this.remote.address

    // NOTE: Contrary to what RFC 1350, Section 2 dictates,
    // we do not send error packets to the originating host in this case,
    // to prevent this from being abused and to avoid interfering with other traffic
    if( !isValidRemote ) {
      return
    }

    switch( packet.opcode ) {
      case TFTP.OPCODE.ACK: return this.onAck( packet, remote )
      case TFTP.OPCODE.DAT: return this.onData( packet, remote )
      case TFTP.OPCODE.ERR: return this.destroy( new TFTP.Error( packet.code, packet.message ) )
      default: return this.error( TFTP.ERROR.ILLEGAL_OPERATION )
    }

  }

  /**
   * Accept a request
   */
  accept() {

    this.stream = new stream.PassThrough()

    if( this.request.opcode == TFTP.OPCODE.WRQ ) {
      this.ack( 0 )
    } else {
      this.send()
    }

    return this.stream

  }

  /**
   * Send an ACK packet to the remote
   * @param {Number} blockNumber
   */
  ack( blockNumber, callback ) {

    var length = TFTP.Packet.Ack.encodingLength()
    var buffer = Buffer.alloc( length )
    var offset = 0

    TFTP.Packet.Ack.encode( buffer, blockNumber )

    this.socket.send(
      buffer, offset, length,
      this.remote.port,
      this.remote.address,
      ( error ) => {
        callback?.call( this, error )
        if( error ) this.destroy( error )
      }
    )

  }

  /**
   * Send an ERROR packet to the remote
   * @param {Number} code
   * @param {String} message
   */
  error( code, message, callback ) {

    var error = new TFTP.Error( code, message )
    var length = TFTP.Packet.Error.encodingLength( error )
    var buffer = Buffer.alloc( length )
    var offset = 0

    TFTP.Packet.Error.encode( buffer, error )

    this.socket.send(
      buffer, offset, length,
      this.remote.port,
      this.remote.address,
      ( error ) => {
        callback?.call( this, error )
        this.destroy( error )
      }
    )

  }

  send() {

    if( this.stream == null ) {
      throw new Error( 'Data stream is null' )
    }

    this.stream.once( 'readable', () => this._onReadable() )
    this.stream.once( 'end', () => this._onReadableEnd() )

  }

  data( chunk ) {

    var length = TFTP.Packet.Data.encodingLength( chunk )
    var offset = 0

    this.packetBuffer = this.packetBuffer ?? Buffer.alloc( TFTP.PACKET_SIZE )
    this.packetBuffer.fill( 0x00 )

    TFTP.Packet.Data.encode(
      this.packetBuffer,
      this.blockNumber,
      chunk
    )

    // console.log( 'data:block',
    //   'block =', this.blockNumber,
    //   'offset =', offset,
    //   'length =', length,
    //   'port =', this.remote.port,
    //   'address =', this.remote.address,
    //   this.packetBuffer
    // )

    this.socket.send(
      this.packetBuffer, offset, length,
      this.remote.port,
      this.remote.address,
      ( error ) => {
        this.blockNumber++
        if( error ) this.destroy( error )
      }
    )

  }

  _onReadable() {

    var chunk = this.stream.read( TFTP.BLOCK_SIZE )
    if( chunk == null && stream.readable ) {
      return this.stream.once( 'readable', () => this._onReadable() )
    }

    if( chunk ) {
      this.data( chunk )
      if( chunk.length < TFTP.BLOCK_SIZE ) {
        this.ended = true
      }
    }

  }

  _onReadableEnd() {

    if( this.ended || !stream.readableLength ) {
      return
    }

    var chunk = null
    var chunks = []

    while( chunk = this.stream.read() ) {
      chunks.push( chunk )
    }

    this.data( Buffer.concat( chunks ) )

  }

  close( callback ) {
    if( callback ) this.once( 'closed', callback )
    this.socket?.close()
  }

  destroy( error ) {
    
    this.destroyed = true

    try { this.socket?.close() }
    catch( e ) {}

    if( error != null ) {
      this.emit( 'error', error )
    }

  }

}

module.exports = Transfer
