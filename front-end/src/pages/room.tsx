import React from 'react'
import {
    useParams
} from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'


interface IRoom {

}

interface ISocketCredentials {
    url: string
    token: string
}

const SOCKET_URI: string = `ws://localhost:8000`

export const Home = ( props: IRoom  ) => {
    let { roomId } = useParams()
    let ioClient = io( SOCKET_URI, {} )

    let credentials: ISocketCredentials = {
        url: localStorage.getItem('url') || '',
        token: localStorage.getItem('token') || ''
    }
    
    ioClient.emit('join', credentials.url, credentials.token )
    ioClient.on('onRequest', async forwardedRequest => {

    
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
    
    
        ioClient?.emit('onResponseFromService', rawResponse )
    })

    return (
        <>
            { roomId }
            <h2>Gateway URL: {`http://${roomId}.localhost:8000`}</h2>
        </>
    )
}

export default Home