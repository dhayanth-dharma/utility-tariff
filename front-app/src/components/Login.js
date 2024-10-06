// src/components/Login.js

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ setAuthToken }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const { username, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8000/api/login/', formData);
            const { token } = res.data;
            setAuthToken(token);
            localStorage.setItem('token', token);
            setMessage('Login successful.');
            setErrors({});
            navigate('/tariff');
        } catch (err) {
            setErrors(err.response.data);
            setMessage('');
        }
    };

    return (
        <div className="container mt-5">
            <div className="box">
                <h1 className="title">Log In</h1>
                {message && <div className="notification is-success">{message}</div>}
                <form onSubmit={onSubmit}>
                    <div className="field">
                        <label className="label">Username</label>
                        <div className="control">
                            <input 
                                className={`input ${errors.username ? 'is-danger' : ''}`}
                                type="text" 
                                name="username" 
                                value={username} 
                                onChange={onChange} 
                                required 
                            />
                        </div>
                        {errors.username && <p className="help is-danger">{errors.username}</p>}
                    </div>

                    <div className="field">
                        <label className="label">Password</label>
                        <div className="control">
                            <input 
                                className={`input ${errors.password ? 'is-danger' : ''}`}
                                type="password" 
                                name="password" 
                                value={password} 
                                onChange={onChange} 
                                required 
                            />
                        </div>
                        {errors.password && <p className="help is-danger">{errors.password}</p>}
                    </div>

                    <div className="field">
                        <div className="control">
                            <button type="submit" className="button is-link">Log In</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
