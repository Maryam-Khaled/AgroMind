import React, { useState, useEffect } from "react";
import { Resizable } from 're-resizable';
import EditIcon from '../assets/images/edit.png'; // Import the icon

function ChatBot() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [plant, setPlant] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [showSpinner, setShowSpinner] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const [hoveredMessageId, setHoveredMessageId] = useState(null);

    useEffect(() => {
        if (editingMessageId !== null) {
            setInput(editingText);
        }
    }, [editingText, editingMessageId]);

    const handleEdit = (index) => {
        const messageToEdit = messages[index];
        // Ensure we are editing a text-only message
        if (messageToEdit && typeof messageToEdit.user === 'string' && !messageToEdit.image) {
            setEditingMessageId(index);
            // messageToEdit.user is the raw text content.
            // Prefixes like "You:" are added during rendering.
            setEditingText(messageToEdit.user);
            setInput(messageToEdit.user);
        }
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditingText("");
        setInput("");
    };

    const sendMessage = async () => {
        if (editingMessageId !== null) { // Edit path
            const messageIndexToUpdate = editingMessageId;
            const newTextForUserDisplay = input.trim();

            if (!newTextForUserDisplay) {
                cancelEdit(); // Cancel if the edited message is empty
                return;
            }

            // Update the user's text and set bot response to loading
            setMessages(prevMessages =>
                prevMessages.map((msg, index) => {
                    if (index === messageIndexToUpdate) {
                        return { ...msg, user: newTextForUserDisplay, bot: "..." }; // Update user text, bot to loading
                    }
                    return msg;
                })
            );
            setShowSpinner(true);

            // Clear editing state after capturing input and updating UI optimistically
            setEditingMessageId(null);
            setEditingText("");
            setInput("");

            try {
                // API call for edited text (assuming palm-chat for text messages)
                const res = await fetch("http://localhost:5005/palm-chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: newTextForUserDisplay }),
                });

                if (!res.ok) throw new Error("Server error during edit");
                const data = await res.json();
                const botResponse = data.response;

                // Update the specific message with the new bot response
                setMessages(prevMessages =>
                    prevMessages.map((msg, index) => {
                        if (index === messageIndexToUpdate) {
                            return { ...msg, bot: botResponse }; // Only update bot response here
                        }
                        return msg;
                    })
                );
            } catch (err) {
                setMessages(prevMessages =>
                    prevMessages.map((msg, index) => {
                        if (index === messageIndexToUpdate) {
                            return { ...msg, bot: "Sorry, I couldn't reach the AI server." };
                        }
                        return msg;
                    })
                );
            } finally {
                setShowSpinner(false);
            }
            return; // Crucial: stop execution for edit path
        }

        // --- Original logic for sending a NEW message ---
        if ((!input.trim() && !image) || (image && !plant.trim())) return;
        let userMsgText = input.trim();
        let userDisplayMsg = userMsgText + (image ? `\n[Image uploaded for ${plant}]` : "");

        let imgUrl = imagePreview;
        setMessages([...messages, { user: userDisplayMsg, bot: "...", image: imgUrl, id: Date.now() }]);
        setShowSpinner(true);
        try {
            let botResponse = "";
            if (image) {
                setUploading(true);
                const formData = new FormData();
                formData.append('image', image);
                formData.append('plant', plant);
                const res = await fetch("http://localhost:5006/detect-disease", {
                    method: "POST",
                    body: formData,
                });
                setUploading(false);
                if (!res.ok) throw new Error("Server error");
                const data = await res.json();
                if (data.confirmation === false) {
                    botResponse = data.message;
                } else if (data.healthy) {
                    botResponse = data.message + (data.confidence ? `\nConfidence: ${(data.confidence * 100).toFixed(2)}%` : "");
                } else {
                    botResponse = `Disease: ${data.disease}\nConfidence: ${(data.confidence * 100).toFixed(2)}%\nAdvice: ${data.advice}`;
                }
            } else {
                const res = await fetch("http://localhost:5005/palm-chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: userMsgText }),
                });
                if (!res.ok) throw new Error("Server error");
                const data = await res.json();
                botResponse = data.response;
            }
            setMessages((prev) =>
                prev.map(msg => msg.bot === "..." && msg.user === userDisplayMsg ? { ...msg, bot: botResponse, image: imgUrl } : msg)
            );
        } catch (err) {
            setMessages((prev) =>
                prev.map(msg => msg.bot === "..." && msg.user === userDisplayMsg ? { ...msg, bot: "Sorry, I couldn't reach the AI server.", image: imgUrl } : msg)
            );
        }
        setInput("");
        setImage(null);
        setPlant("");
        setImagePreview(null);
        setShowSpinner(false);
    };

    const handleInputChange = (e) => {
        if (editingMessageId !== null) {
            setEditingText(e.target.value);
        }
        setInput(e.target.value);
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
            setImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview(null);
    };

    return (
        <>
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    position: "fixed",
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                    borderRadius: "50%",
                    width: 56,
                    height: 56,
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    fontSize: 28,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    cursor: "pointer"
                }}
                aria-label="Open chat"
            >
                💬
            </button>
            {open && (
                <Resizable
                    defaultSize={{ width: 500, height: 600 }}
                    minWidth={320}
                    minHeight={320}
                    maxWidth="90vw"
                    maxHeight="90vh"
                    style={{
                        position: "fixed",
                        top: "50%",
                        right: 40,
                        transform: "translateY(-50%)",
                        zIndex: 1000,
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            background: "#fff",
                            borderRadius: 12,
                            boxShadow: "0 4px 32px rgba(0,0,0,0.3)",
                            display: "flex",
                            flexDirection: "column",
                            fontSize: 18,
                            minWidth: 0,
                            minHeight: 0
                        }}
                    >
                        <div style={{ padding: 18, borderBottom: "1px solid #eee", background: "#1976d2", color: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, fontSize: 22 }}>
                            AgroMind Chatbot
                            <button onClick={() => setOpen(false)} style={{ float: "right", background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                            {messages.map((msg, i) => (
                                <div key={msg.id || i} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {msg.user && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-end',
                                                gap: '4px'
                                            }}
                                            onMouseEnter={() => msg.id && setHoveredMessageId(msg.id)}
                                            onMouseLeave={() => setHoveredMessageId(null)}
                                        >
                                            <div style={{
                                                background: '#f0f0f0',
                                                padding: '8px 12px',
                                                borderRadius: '15px',
                                                borderTopRightRadius: '5px',
                                                maxWidth: '70%',
                                                boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                                                whiteSpace: 'pre-wrap',
                                                wordWrap: 'break-word',
                                                position: 'relative'
                                            }}>
                                                <b>You:</b> {msg.user}
                                                {msg.image && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <img src={msg.image} alt="Uploaded" style={{ display: 'block', maxWidth: 180, maxHeight: 180, borderRadius: 8, border: '1px solid #ccc' }} />
                                                    </div>
                                                )}
                                            </div>
                                            {hoveredMessageId === msg.id && !msg.image && editingMessageId !== i && (
                                                <button
                                                    onClick={() => handleEdit(i)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '0',
                                                        cursor: 'pointer',
                                                        alignSelf: 'flex-end',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                    title="Edit message"
                                                >
                                                    <img src={EditIcon} alt="Edit" style={{ width: '16px', height: '16px', display: 'block' }} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {msg.bot && msg.bot !== "..." && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                            <div style={{
                                                background: '#ffffff',
                                                border: '1px solid #e0e0e0',
                                                padding: '8px 12px',
                                                borderRadius: '15px',
                                                borderTopLeftRadius: '5px',
                                                maxWidth: '75%',
                                                boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                                                whiteSpace: 'pre-wrap',
                                                wordWrap: 'break-word'
                                            }}>
                                                <b>Bot:</b> {msg.bot}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {showSpinner && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0' }}>
                                    <div style={{
                                        border: '4px solid #f3f3f3',
                                        borderTop: '4px solid #1976d2',
                                        borderRadius: '50%',
                                        width: 36,
                                        height: 36,
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                    <span style={{ marginLeft: 12, color: '#1976d2', fontWeight: 500 }}>Analyzing...</span>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", borderTop: "1px solid #eee", padding: 14, alignItems: "center" }}>
                            {image && (
                                <input
                                    type="text"
                                    value={plant}
                                    onChange={(e) => setPlant(e.target.value)}
                                    placeholder="Enter plant name (e.g., Corn)"
                                    style={{ flex: 1, padding: 12, border: "1px solid #ddd", borderRadius: 8, marginRight: 8, fontSize: 16 }}
                                />
                            )}

                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                marginRight: 8,
                            }}>
                                <input
                                    type="file"
                                    id="imageUpload"
                                    onChange={handleImageChange}
                                    style={{ display: "none" }}
                                    accept="image/*"
                                />
                                <label
                                    htmlFor="imageUpload"
                                    title="Upload image"
                                    style={{
                                        padding: '12px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        color: '#757575',
                                        borderRight: '1px solid #ddd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    +
                                </label>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder={editingMessageId !== null ? "Edit your message..." : "Type a message or click + to add image..."}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        border: 'none',
                                        borderRadius: '0 7px 7px 0',
                                        fontSize: 16,
                                        outline: 'none',
                                    }}
                                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                />
                            </div>

                            {imagePreview && (
                                <button onClick={handleRemoveImage} style={{ padding: '10px', background: '#ef5350', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginRight: 8, fontSize: 16 }}>
                                    🗑️
                                </button>
                            )}
                            <button onClick={sendMessage} style={{ padding: 12, background: editingMessageId !== null ? "#4caf50" : "#1976d2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
                                {editingMessageId !== null ? "Update" : "Send"}
                            </button>
                            {editingMessageId !== null && (
                                <button onClick={cancelEdit} style={{ marginLeft: '8px', padding: 12, background: '#757575', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </Resizable>
            )}
        </>
    );
}

export default ChatBot;
