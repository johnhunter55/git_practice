import { useState } from 'react'

export default function Auth({ pb, onLogin }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const email = e.target.email.value
        const password = e.target.password.value

        try {
            // This is the magic line that talks to PocketBase
            const authData = await pb.collection('users').authWithPassword(email, password)
            onLogin(authData.record)
        } catch (err) {
            setError('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="back-log-container">
            <div className="login-container">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="log-inputs">
                        <input type="email" name="email" placeholder="Email" required />
                        <input type="password" name="password" placeholder="Password" required />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Enter Gallery'}
                        </button>
                    </div>
                </form>
                {error && <p className="error">{error}</p>}
            </div >
        </div >
    )
}