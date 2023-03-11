import http from 'http'
import { v4 } from 'uuid'

import io from 'socket.io'
import cors from 'cors'

import express from 'express'
import morgan from 'morgan'


const PORT = process.env.PORT || 8000

const ioRooms = new Map<string, IORoomManager>()

const expressApp = express()

expressApp.use( express.json() )
expressApp.use( morgan('dev') )
expressApp.use( cors( { origin: '*' } ) )

if ( process.env.DEVELOPMENT ) expressApp.set( `subdomain offset`, 1 )

/**
 * Create a new room in SocketIOServer with random UUID.
 * add a sessionToken for authentication as well.
 */
expressApp.post( `/session/generate`, async (req, res, next) => {

    let url = v4()
    let token = v4()
    let localServiceUri = req.body.localServiceUri

    if ( !localServiceUri ) {

        res.status( 500 )
        .json({
            status: 500,
            data: {
                msg: `localServiceUri not mentioned in POST data.`
            }
        })

        return;
    }

    ioRooms.set( url, new IORoomManager( { roomId: url, roomToken: token, localServerUri: localServiceUri }))

    res.status(200)
        .json({
            url,
            token
        })
})

expressApp.use( `/`, ( req, res, next ) => {

    let [ roomId ] = req.subdomains 

    let room = ioRooms.get( roomId )

    if ( !room ) {
        res
        .status( 404 )
        .json({ status: 400, data: { msg: `Invalid session: ${ roomId }` } } )
        return
    }

    room.sendRequest( req, res )
})


const httpServer = http.createServer( expressApp )
const ioServer = new io.Server( httpServer, { 
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
})

ioServer.on('connection', socket => {
    socket.on('onResponseFromService', (response:IServiceResponse) => IORoomManager.sendServiceResponse( response ) )
    socket.on('join', ( roomId, roomToken ) => {

        let roomManager = ioRooms.get( roomId )

        if ( !roomManager ) {
            console.log(`client tried to join ${roomId} (doesn't exist!)`)
            return;
        }

        if ( !roomManager.authClient( roomToken ) ) {
            console.log(`client tried to join ${roomId} (invalid roomToken!)`)
            return;
        }

        console.log(`client joins room: ${roomId}`)
        socket.join( roomId )
    })
})

interface IForwardedRequest {
    requestId: string,
    roomId: string,
    localServiceEndpointUri: string
    method: string,
    route: string,
    body: object | any
}

type ServiceResponse = Pick<IForwardedRequest, 'requestId' | 'roomId' | 'body'>
interface IServiceResponse extends ServiceResponse {
    status: number
}

class IORoomManager {

    private requestsMap: Map<string, express.Response>

    constructor( private roomCredentials: { roomId: string, roomToken: string, localServerUri: string } ) {
        this.requestsMap = new Map<string, express.Response>()
    }

    static sendServiceResponse( response: IServiceResponse ) {
        console.log(`static sendServiceResponse(res)`)

        console.log( response )
        let roomId = response.roomId
        let room = ioRooms.get( roomId )

        if ( !room ) {
            console.log(`Service Response: ${roomId} not found!??`)
            return
        }

        room.onResponseReceivedFromService( response )
    }

    sendRequest( req: express.Request, res: express.Response ) {

        let method = req.method
        let route = req.originalUrl

        let requestId = v4()

        this.requestsMap.set( requestId, res ) //! store the response Object in room storage.

        let toForward = {
            requestId,
            roomId: this.roomCredentials.roomId,
            method,
            route,
            body: req.body,
            localServiceEndpointUri: this.roomCredentials.localServerUri
        } as IForwardedRequest

        ioServer.to( this.roomCredentials.roomId )
            .emit( `onRequest`, toForward )

        setTimeout( this.clearResponse.bind(this, requestId ), 10000 ) //! after 10(secs) end the response automatically, if response not received.
    }

    onResponseReceivedFromService( response: IServiceResponse ) {

        let requestId = response.requestId
        let responseObject = this.requestsMap.get( requestId );

        if ( !responseObject ) {
            console.log(`ERROR: ${requestId} [RESPONSE OBJECT MISSING]`)
            return
        }

        responseObject
            .status( response.status )
            .json( response.body )

        this.requestsMap.delete( requestId )
    }

    clearResponse( requestId: string ) {
        let responseObject = this.requestsMap.get( requestId )

        if ( !responseObject ) {
            return
        }

        console.log(`Clearing request ${ requestId }`)
        responseObject.status(500)
            .json({
                status: 500,
                data: {
                    message: `No response from Client.`
                }
            })
    }

    authClient( inputToken: string ) {
        return this.roomCredentials.roomToken == inputToken
    }
}



httpServer.listen( PORT, () => console.log(`DEV SERVER AT PORT: ${PORT}`) )