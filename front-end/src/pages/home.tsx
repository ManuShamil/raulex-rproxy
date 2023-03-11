import axios, { AxiosRequestConfig } from 'axios'
import React from 'react'
import { useNavigate } from 'react-router-dom';


const Home = () => {
    
    const navigate = useNavigate()

    let localServiceUri = ``

    const endPointHost = `http://localhost:8000`
    const endPointGenerate = `/session/generate`

    const uri = `${endPointHost}${endPointGenerate}`

    const createNewSession = async (e: React.MouseEvent ) => {
        console.log(localServiceUri)
        e.preventDefault()

        let response = await axios.request(
            {
                url: uri,
                method: `POST`,
                data: {
                    localServiceUri
                }
            } as AxiosRequestConfig
        )

        let { data } = response
        let { url, token } = data
        
        localStorage.setItem( `url`, url )
        localStorage.setItem( `token`, token )

        navigate(`/${url}`);
    }
    
    const inputOnChange = ( e: React.ChangeEvent<HTMLInputElement> ) => {
        localServiceUri = e.target.value
    }

    return (
        <div>
            <h1>Home</h1>

            <div>
                <form method="post" action={uri} >
                    <input 
                    onChange={ inputOnChange } type="text" name="localService" />
                    <button type="submit" onClick={ createNewSession }>Create</button>
                </form>
            </div>


        </div>
    )
}

export default Home