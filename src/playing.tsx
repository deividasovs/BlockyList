import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip, Paper, Typography, Box, Fade } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { motion } from 'framer-motion';

export const Play = () => {
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [flungItems, setFlungItems] = React.useState<number[]>([]);
    // Add drag state
    const [dragInfo, setDragInfo] = React.useState<{
        isDragging: boolean;
        index: number | null;
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        timestamp: number;
    }>({
        isDragging: false,
        index: null,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        timestamp: 0
    });

    // Updated color swatches with pastel palettes
    const swatches = [
        // Red pastels
        ['#FFB3B3', '#FFC2C2', '#FFD1D1', '#FFE0E0', '#FFEFEF'],
        // Green pastels
        ['#B3FFB3', '#C2FFC2', '#D1FFD1', '#E0FFE0', '#EFFFE0'],
        // Blue pastels
        ['#B3B3FF', '#C2C2FF', '#D1D1FF', '#E0E0FF', '#EFEFFF'],
        // Yellow pastels
        ['#FFFFC2', '#FFFFD1', '#FFFFE0', '#FFFFEF', '#FFFFF0'],
        // Magenta pastels
        ['#FFB3FF', '#FFC2FF', '#FFD1FF', '#FFE0FF', '#FFEFFF'],
        // Cyan pastels
        ['#B3FFFF', '#C2FFFF', '#D1FFFF', '#E0FFFF', '#EFFFFF'],
    ];

    const handleMouseDown = (e: React.MouseEvent, index: number) => {
        setDragInfo({
            isDragging: true,
            index,
            startX: e.clientX,
            startY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            timestamp: Date.now()
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragInfo.isDragging && dragInfo.index !== null) {
            setDragInfo(prev => ({
                ...prev,
                lastX: e.clientX,
                lastY: e.clientY,
                timestamp: Date.now()
            }));
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (dragInfo.isDragging && dragInfo.index !== null) {
            const deltaTime = Date.now() - dragInfo.timestamp;
            const deltaX = e.clientX - dragInfo.lastX;
            const deltaY = e.clientY - dragInfo.lastY;
            const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

            if (velocity > 0.5) { // Minimum velocity to trigger fling
                setFlungItems(prev => [...prev, dragInfo.index!]);
                setTimeout(() => {
                    setFlungItems(prev => prev.filter(i => i !== dragInfo.index));
                }, 1000);
            }
        }
        setDragInfo({
            isDragging: false,
            index: null,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            timestamp: 0
        });
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
            <Paper
                elevation={0}
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(135, 206, 235, 0.8)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 100,
                }}
            >
                <Tooltip title="Return Home">
                    <IconButton
                        onClick={() => navigate('/')}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.8)',
                            '&:hover': {
                                bgcolor: 'white',
                            },
                            mr: 2
                        }}
                    >
                        <HomeIcon />
                    </IconButton>
                </Tooltip>
                <Typography variant="h6" fontWeight="bold">
                    Your Blockylists
                </Typography>
            </Paper>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                style={{
                    padding: '5rem 2rem 2rem',
                    margin: 0,
                    boxSizing: 'border-box',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    backgroundColor: '#87CEEB',
                    minHeight: '100vh',
                    background: 'linear-gradient(180deg, #87CEEB 0%, #B0E2FF 100%)',
                    overflow: 'hidden'
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Enhanced washing line with rope texture */}
                <div style={{
                    position: 'absolute',
                    top: '150px',
                    left: '5%',
                    right: '5%',
                    height: '3px',
                    background: 'linear-gradient(180deg, #444 0%, #666 50%, #444 100%)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    zIndex: 1,
                    transform: 'rotate(-1deg)', // Slight angle for realism
                }} />

                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    position: 'relative',
                    height: '500px',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingTop: '120px'
                }}>
                    {swatches.map((palette, index) => (
                        <motion.div
                            key={index}
                            initial={{ y: -300, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 120,
                                damping: 10,
                                delay: index * 0.1
                            }}
                            style={{
                                width: '120px',
                                height: '250px',
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                transition: 'all 0.3s ease',
                                animation: flungItems.includes(index)
                                    ? `fling${index % 3} 1s ease-in forwards`
                                    : `sway${index % 2 ? '2' : '1'} ${4 + index % 2}s ease-in-out infinite`,
                                visibility: flungItems.includes(index) ? 'hidden' : 'visible',
                                margin: 0,
                                padding: '10px 5px',
                                border: '1px solid rgba(0,0,0,0.1)',
                                boxSizing: 'border-box',
                                position: 'relative',
                                boxShadow: hoveredIndex === index
                                    ? '0 15px 25px rgba(0,0,0,0.15)'
                                    : '0 8px 15px rgba(0,0,0,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                transformOrigin: 'top center',
                                transform: dragInfo.isDragging && dragInfo.index === index
                                    ? `translate(${dragInfo.lastX - dragInfo.startX}px, ${dragInfo.lastY - dragInfo.startY}px)`
                                    : hoveredIndex === index
                                        ? 'rotate(0deg) scale(1.05)'
                                        : `rotate(${(index % 2 ? 6 : -6)}deg)`,
                                // Add fabric texture
                                backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.1) 75%, transparent 75%, transparent)',
                                backgroundSize: '10px 10px',
                                cursor: 'grab',
                                userSelect: 'none'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, index)}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            whileHover={{ scale: 1.05, rotate: 0 }}
                        >
                            {/* Enhanced clothespin */}
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '24px',
                                height: '28px',
                                background: 'linear-gradient(90deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
                                borderRadius: '3px',
                                zIndex: 2,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                border: '1px solid rgba(0,0,0,0.2)',
                            }}>
                                {/* Clothespin detail as child div */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: '80%',
                                    height: '2px',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    transform: 'translate(-50%, -50%)'
                                }} />
                            </div>

                            {palette.map((color, colorIndex) => (
                                <div
                                    key={colorIndex}
                                    style={{
                                        width: '100%',
                                        height: '40px',
                                        backgroundColor: color,
                                        borderRadius: '4px',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        // Add fabric texture
                                        backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.1) 75%, transparent 75%, transparent)',
                                        backgroundSize: '10px 10px'
                                    }}
                                />
                            ))}
                        </motion.div>
                    ))}
                </div>

                <Fade in={true} timeout={1000}>
                    <Typography
                        variant="h5"
                        sx={{
                            textAlign: 'center',
                            mt: 4,
                            fontWeight: 'bold',
                            color: '#333',
                            textShadow: '0 1px 2px rgba(255,255,255,0.5)'
                        }}
                    >
                        Drag and fling the color palettes!
                    </Typography>
                </Fade>

                {/* Enhanced sway animations */}
                <style>
                    {`
                        @keyframes sway1 {
                            0% { transform: rotate(-6deg); }
                            25% { transform: rotate(-5deg); }
                            50% { transform: rotate(-7deg); }
                            75% { transform: rotate(-5deg); }
                            100% { transform: rotate(-6deg); }
                        }
                        @keyframes sway2 {
                            0% { transform: rotate(6deg); }
                            25% { transform: rotate(7deg); }
                            50% { transform: rotate(5deg); }
                            75% { transform: rotate(7deg); }
                            100% { transform: rotate(6deg); }
                        }
                        @keyframes fling0 {
                            0% { transform: rotate(-6deg); }
                            30% { transform: rotate(10deg) translateY(0); }
                            100% { transform: rotate(720deg) translateY(1000px) translateX(-200px); }
                        }
                        @keyframes fling1 {
                            0% { transform: rotate(6deg); }
                            30% { transform: rotate(-10deg) translateY(0); }
                            100% { transform: rotate(-720deg) translateY(1000px) translateX(200px); }
                        }
                        @keyframes fling2 {
                            0% { transform: rotate(-6deg); }
                            30% { transform: rotate(10deg) translateY(0); }
                            100% { transform: rotate(720deg) translateY(1000px) translateX(0); }
                        }
                    `}
                </style>
            </motion.div>

            {selectedImage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                        cursor: 'pointer'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        style={{
                            padding: '20px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                        }}
                    >
                        <img
                            src={selectedImage}
                            alt="Random"
                            style={{
                                maxWidth: '400px',
                                maxHeight: '400px',
                                display: 'block',
                                borderRadius: '8px'
                            }}
                        />
                    </div>
                </div>
            )}
        </Box>
    );
};


