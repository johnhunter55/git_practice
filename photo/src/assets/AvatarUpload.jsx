import { useState } from 'react'; // Don't forget this import!

export default function AvatarUpload({ user, pb, setUser }) {
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState(pb.authStore.model);

    const handleUpload = async (e) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('avatar', e.target.files[0]);

        const updatedRecord = await pb.collection('users').update(user.id, formData);
        setUser(updatedRecord);
        setUploading(false);
    };
    return (
        <div style={{ width: '100%' }}>
            {/* 1. The visible button (The Remote) */}
            <label
                htmlFor="avatar-input"
                style={{
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '1.1em',
                    fontWeight: '300',
                    width: '100%',
                    padding: '5px'
                    /* Optional: Add a hover effect or icon here */
                }}
            >
                <div className='change'>
                    <span className='material-symbols-outlined'>account_box</span>
                    {uploading ? 'Uploading...' : 'change'}
                </div>

            </label>

            {/* 2. The invisible input (The TV) */}
            <input
                id="avatar-input" // This ID connects it to the label
                type="file"
                onChange={handleUpload}
                accept="image/*"
                style={{ display: 'none' }} // Totally hidden!
                disabled={uploading}
            />
        </div>
    );
}
