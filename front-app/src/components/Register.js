
import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: ''
    });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');

    const { username, email, password, password2 } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        if (password !== password2) {
            setErrors({ password2: "Passwords do not match." });
            return;
        }
        try {
            const res = await axios.post('http://localhost:8000/api/register/', formData);
            setSuccess('Registration successful. You can now log in.');
            setFormData({
                username: '',
                email: '',
                password: '',
                password2: ''
            });
            setErrors({});
        } catch (err) {
            setErrors(err.response.data);
            setSuccess('');
        }
    };

    return (
        <div className="container mt-5">
            <div className="box">
                <h1 className="title">Register</h1>
                {success && <div className="notification is-success">{success}</div>}
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
                        <label className="label">Email</label>
                        <div className="control">
                            <input 
                                className={`input ${errors.email ? 'is-danger' : ''}`}
                                type="email" 
                                name="email" 
                                value={email} 
                                onChange={onChange} 
                                required 
                            />
                        </div>
                        {errors.email && <p className="help is-danger">{errors.email}</p>}
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
                        <label className="label">Confirm Password</label>
                        <div className="control">
                            <input 
                                className={`input ${errors.password2 ? 'is-danger' : ''}`}
                                type="password" 
                                name="password2" 
                                value={password2} 
                                onChange={onChange} 
                                required 
                            />
                        </div>
                        {errors.password2 && <p className="help is-danger">{errors.password2}</p>}
                    </div>

                    <div className="field">
                        <div className="control">
                            <button type="submit" className="button is-primary">Register</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;