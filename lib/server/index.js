var UDP = require( 'dgram' )
var EventEmitter = require( 'events' )
var TFTP = require( '../tftp' )

class TftpServer extends EventEmitter {

  static Transfer = require( './transfer' )

  constructor( options ) {

    super( options )

    this.packetTtl = options?.ttl
    this.reuseAddr = options?.reuseAddr ?? false

    this.socketTimeout = TFTP.SOCKET_TIMEOUT
    this.txTimeout = TFTP.TX_TIMEOUT

    this.socket = null
    this.transfers = new Map()

  }

  address() {
    return this.socket?.address()
  }

  sendError( error, remote, callback ) {

    var length = TFTP.Packet.Error.encodingLength( error )
    var buffer = Buffer.alloc( length )

    TFTP.Packet.Error.encode( buffer, error )

    this.socket.send( buffer, 0, length, remote.port, remote.address, ( error ) => {
      // Ignore any transmission errors for misdirected packets
      if( error != null ) this.emit( 'warning', error, msg, remote )
      callback?.call( this, error, msg, remote )
    })

  }

  onMessage( msg, remote ) {

    var packet = null
    try { packet = TFTP.Packet.decode( msg, 0, remote.size ) }
    catch( error ) { return } // Ignore malformed or misdirected packets

    // If the incoming message is neither a write- nor read-request
    // it is an illegal operation, as ERRORs and ACKs should be sent to
    // their respective TID's source port
    if( packet.opcode != TFTP.OPCODE.RRQ && packet.opcode != TFTP.OPCODE.WRQ ) {
      return this.sendError( new TFTP.Error( TFTP.ERROR.ILLEGAL ), remote )
    }

    var id = `[${remote.address}]:${remote.port}`

    if( this.transfers.has( id ) ) {
      var error = new TFTP.Error( TFTP.ERROR.ILLEGAL_OPERATION, 'Transfer already in progress' )
      return this.sendError( error, remote )
    }

    var source = this.socket.address()
    var transfer = new TftpServer.Transfer({
      address: source.address,
      family: source.family,
      remote: remote,
      ttl: this.packetTtl,
      request: packet,
      socketTimeout: this.socketTimeout,
      txTimeout: this.txTimeout,
    })

    transfer.open(( error ) => {

      if( error ) {
        // We failed to allocate a session for the transfer
        this.sendError( new TFTP.Error( TFTP.ERROR.ALLOCATION_FAILED ), remote )
        return transfer.destroy()
      }

      transfer.on( 'close', () => {
        this.transfers.delete( transfer.id )
        this.emit( 'transfer:close', transfer )
      })

      transfer.on( 'error', ( error ) => {
        this.transfers.delete( transfer.id )
        this.emit( 'transfer:error', error, transfer )
      })

      this.transfers.set( transfer.id, transfer )

      var handled = ( packet.opcode == TFTP.OPCODE.WRQ )
        ? this.emit( 'write-request', transfer )
        : this.emit( 'read-request', transfer )

      // If the request is not handled, destroy the transfer and
      // respond with a generic error
      if( handled == false ) {
        transfer.destroy()
        this.sendError( new TFTP.Error( TFTP.ERROR.ILLEGAL_OPERATION ), remote )
      }

    })

  }

  listen( port, address, callback ) {

    if( typeof port == 'function' ) {
      callback = port
      port = undefined
    }

    if( typeof address == 'function' ) {
      callback = address
      address = undefined
    }

    port = port ?? TFTP.PORT

    this.socket = UDP.createSocket({
      type: 'udp4',
      reuseAddr: !!this.reuseAddr,
    })

    this.socket.on( 'error', ( error ) => this.emit( 'error', error ))
    this.socket.on( 'message', ( msg, remote ) => this.onMessage( msg, remote ))
    this.socket.on( 'close', () => {
      this.socket = null
      this.emit( 'close' )
    })

    this.socket.bind( port, address, ( error ) => {

      if( error != null ) {
        return void callback?.call( this, error )
      }

      if( this.packetTtl != null ) {
        this.socket.setTTL( this.packetTtl )
      }

      callback?.call( this, error )
      this.emit( 'listening' )

    })

  }

  close( callback ) {

    if( this.socket == null ) {
      return void callback?.call( this )
    }

    this.socket.close(() => callback?.call( this ))

  }

}

module.exports = TftpServer
