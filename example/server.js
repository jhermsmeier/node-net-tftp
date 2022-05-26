var fs = require( 'fs' )
var path = require( 'path' )

var TFTP = require( '..' )
var server = new TFTP.Server({
  reuseAddr: true,
})

server.listen( null, 'localhost', () => {
  console.log( '[INFO]', 'TFTP Server listening', server.address() )
})

server.on( 'read-request', ( transfer ) => {

  console.log( '[INFO]', transfer.request, 'from', transfer.remote )

  var filename = path.join( '/', transfer.request.filename )
  var filepath = path.join( __dirname, filename )

  try {
    var stats = fs.statSync( filepath )
    var readStream = fs.createReadStream( filepath )
    readStream.pipe( transfer.accept() )
  } catch( error ) {
    console.log( '[ERROR]', error.message )
    if( error.code == 'ENOENT' ) {
      transfer.error( TFTP.ERROR.NOT_FOUND )
    } else {
      transfer.error( TFTP.ERROR.UNDEFINED, 'Internal Server Error' )
    }
  }

})

server.on( 'write-request', ( transfer ) => {
  transfer.accept().on( 'data', ( chunk ) => {
    console.log( chunk.toString() )
  })
})
