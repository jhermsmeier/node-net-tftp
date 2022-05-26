var TFTP = require( './tftp' )

class TftpError extends Error {

  constructor( code, message ) {

    code = code || TFTP.ERROR.UNDEFINED

    if( typeof message != 'string' ) {
      message = Object.hasOwn( TFTP.ERROR_MESSAGE, code )
        ? TFTP.ERROR_MESSAGE[ code ]
        : TFTP.ERROR_MESSAGE[ 0 ]
    }

    super( message )
    this.code = code

  }

}

module.exports = TftpError
