import React, { useState } from 'react';

export default function AvatarUpload({ user, pb, setUser }) {
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState(user.name || '');
    const [isEditingName, setIsEditingName] = useState(false);

    // 1. Handle Avatar Upload
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const updatedUser = await pb.collection('users').update(user.id, formData);
            setUser(updatedUser);
        } catch (err) {
            console.error("Avatar upload failed:", err);
            alert("Failed to upload avatar");
        } finally {
            setUploading(false);
        }
    };

    // 2. Handle Name Change
    const handleNameSubmit = async () => {
        if (!name.trim() || name === user.name) {
            setIsEditingName(false);
            return;
        }

        setUploading(true);
        try {
            const updatedUser = await pb.collection('users').update(user.id, {
                name: name.trim()
            });
            setUser(updatedUser);
            setIsEditingName(false);
        } catch (err) {
            console.error("Name update failed:", err);
            alert("Failed to update name");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '10px 0' }}>

            {/* --- AVATAR SECTION --- */}
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <img
                    src={user.avatar
                        ? pb.files.getURL(user, user.avatar, { thumb: '100x100' })
                        : "https://via.placeholder.com/100?text=?"}
                    alt="avatar"
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid rgba(255,255,255,0.1)'
                    }}
                />

                {/* Hidden File Input + Overlay Label */}
                <label
                    style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        backgroundColor: '#3b82f6',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '2px solid #1f1f1f',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                    }}
                >
                    {uploading ? (
                        <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                    ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white' }}>edit</span>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        disabled={uploading}
                    />
                </label>
            </div>

            {/* --- NAME SECTION --- */}
            <div style={{ width: '100%' }}>
                {!isEditingName ? (
                    <div
                        onClick={() => setIsEditingName(true)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            cursor: 'text',
                            fontSize: '0.95rem'
                        }}
                        title="Click to edit username"
                    >
                        <span style={{ fontWeight: 500 }}>{user.name || "Set Name"}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#666' }}>edit</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter Name"
                            autoFocus
                            style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backgroundColor: '#262626',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameSubmit();
                                if (e.key === 'Escape') {
                                    setName(user.name);
                                    setIsEditingName(false);
                                }
                            }}
                        />
                        <button
                            onClick={handleNameSubmit}
                            disabled={uploading}
                            style={{
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                borderRadius: '8px',
                                width: '36px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check</span>
                        </button>
                    </div>
                )}
            </div>

            <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        </div>
    );
}