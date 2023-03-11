const { io } = require('socket.io-client')
const express = require('express')
const axios = require('axios')
const morgan = require('morgan')
const cors = require('cors')

const SESSION_GENERATE_URL = `http://localhost:8000/session/generate`
const APP_WEB_SOCKET = `ws://localhost:8000`
const LOCAL_SERVICE_URI = `http://localhost:5000`

const clientApp = {

    start: async () => {
        let response = await axios.request(
            {
                url: SESSION_GENERATE_URL,
                method: `POST`,
                data: {
                    localServiceUri: LOCAL_SERVICE_URI
                }
            }
        )
        let { data, status } = response
        let { url, token } = data
        
        console.log( url )

        const client = io( APP_WEB_SOCKET, {} )
        client.emit('join', url, token )


        client.on('onRequest', async forwardedRequest => {

            console.log( forwardedRequest )
        
            let localUri = forwardedRequest.localServiceEndpointUri
            let uri = new URL( forwardedRequest.route, localUri ).href
        
        
            let response = await axios.request(
                {
                    url: uri,
                    method: forwardedRequest.method,
                    data: forwardedRequest.body
                }
            )
        
            let { data, status } = response
        
        
            let rawResponse = {
                requestId: forwardedRequest.requestId,
                roomId: forwardedRequest.roomId,
                status: status,
                body: data
            }
        
        
            client.emit('onResponseFromService', rawResponse )
        })
    }
}

const SERVER_PORT = 5000
const app = express()

app.use( morgan( 'dev' ) )
app.use( express.json() ) 
app.use( cors({ origin: '*' }) )

app.use(( req, res, next ) => {
    
    let body = req.body
    res.status(200)
    .json(body)

})


app.listen( SERVER_PORT, () => console.log(`CLIENT'S LOCAL SERVICE RUNNING ON PORT: ${SERVER_PORT}`))

clientApp.start()