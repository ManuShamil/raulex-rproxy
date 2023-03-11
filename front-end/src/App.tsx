import React from 'react';

import { 
  BrowserRouter,
  Route,
  Routes, 
} from 'react-router-dom'

import Layout from './layout'
import Home from './pages/home'
import Room from './pages/room'
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/:roomId" element={ <Room/>} />
          {/* <Route path="blogs" element={<Blogs />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NoPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
