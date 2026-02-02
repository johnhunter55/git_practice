import { useState } from 'react'

export default function Auth({ pb, onLogin }) {
    // STATE: "true" means Login mode, "false" means Sign Up mode
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const data = {
            email: e.target.email.value,
            password: e.target.password.value,
            passwordConfirm: e.target.passwordConfirm?.value,
            name: e.target.name?.value, // Optional: Capture name if you want
        }

        try {
            if (isLogin) {
                // --- LOGIN MODE ---
                const authData = await pb.collection('users').authWithPassword(data.email, data.password)
                onLogin(authData.record)
            } else {
                // --- SIGN UP MODE ---
                // 1. Create the account
                await pb.collection('users').create(data)

                // 2. Automatically log them in after creation
                const authData = await pb.collection('users').authWithPassword(data.email, data.password)
                onLogin(authData.record)
            }
        } catch (err) {
            // PocketBase errors are objects, so we try to print a readable message
            console.error(err)
            setError(isLogin ? 'Invalid email or password' : 'Failed to create account. Password must be 8+ chars.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-container">
                <h2>{isLogin ? 'Client Login' : 'Create Account'}</h2>

                <form onSubmit={handleSubmit}>
                    {/* Name field (Only for Sign Up) */}
                    {!isLogin && (
                        <input type="text" name="name" placeholder="Full Name (Optional)" />
                    )}

                    <input type="email" name="email" placeholder="Email" required />
                    <input type="password" name="password" placeholder="Password" required />

                    {/* Confirm Password (Only for Sign Up) */}
                    {!isLogin && (
                        <input type="password" name="passwordConfirm" placeholder="Confirm Password" required />
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Enter Gallery' : 'Sign Up')}
                    </button>
                </form>

                {error && <p className="error">{error}</p>}

                {/* TOGGLE BUTTON */}
                <p style={{ marginTop: '20px', color: '#ccc', fontSize: '0.9rem' }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setError('') // Clear errors when switching
                        }}
                        style={{
                            background: 'none',
                            color: '#4dabf7',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginLeft: '5px',
                            width: 'auto',
                            padding: 0,
                            display: 'inline'
                        }}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    )
}