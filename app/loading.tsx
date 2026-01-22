import { View } from '@/components/Themed';
import { ConfigService } from '@/services/ConfigService';
import { ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, SafeAreaView, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default function LoadingSyncScreen() {
    const router = useRouter();
    // Progress Bar Animation
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressBarOpacity = useRef(new Animated.Value(1)).current; // New opacity for bar only

    // Status State
    const [statusText, setStatusText] = useState('Inizializzazione...');
    const [configLoaded, setConfigLoaded] = useState(false);
    const [minTimePassed, setMinTimePassed] = useState(false);

    // Video Refs to manage playback
    const loadingVideo = useRef<Video>(null);
    const endVideo = useRef<Video>(null);

    // Phase: 'loading' (loop) -> 'ending' (play once)
    const [phase, setPhase] = useState<'loading' | 'ending'>('loading');

    useEffect(() => {
        // Animation in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Progress Bar Simulation
        Animated.timing(progressAnim, {
            toValue: 0.8, // Go to 80% quickly
            duration: 2000,
            useNativeDriver: false,
        }).start();

        // Start Config Fetch
        loadConfig();

        // Enforce minimum time for the loading video
        const timer = setTimeout(() => {
            setMinTimePassed(true);
        }, 2200);

        return () => clearTimeout(timer);
    }, []);

    const loadConfig = async () => {
        setStatusText('Ottimizzazione esperienza...');
        try {
            await ConfigService.fetchConfig();
            console.log('Config loaded');
        } catch (e) {
            console.error('Config load failed', e);
        } finally {
            setConfigLoaded(true);
        }
    };

    // Watch for both conditions to be met
    useEffect(() => {
        if (configLoaded && minTimePassed && phase === 'loading') {
            finishLoading();
        }
    }, [configLoaded, minTimePassed, phase]);

    const finishLoading = () => {
        // 1. Complete the progress bar
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
        }).start(() => {
            // 2. Fade out status and bar
            setStatusText('');
            Animated.timing(progressBarOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                // 3. Start ending video
                transitionToEnding();
            });
        });
    };

    const transitionToEnding = () => {
        setPhase('ending');
    };

    const handleEndVideoFinish = () => {
        // Navigate away after the end video finishes
        // Wait slightly to show the final state
        setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                router.replace('/(tabs)');
            });
        }, 300);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

                <View style={styles.videoContainer}>
                    {/* Render BOTH videos to ensure instant switch */}
                    <Video
                        ref={loadingVideo}
                        style={[styles.video, { opacity: phase === 'loading' ? 1 : 0 }]}
                        source={require('@/assets/videos/loading.mp4')}
                        useNativeControls={false}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        shouldPlay={phase === 'loading'}
                    />

                    <Video
                        ref={endVideo}
                        style={[styles.video, { position: 'absolute', opacity: phase === 'ending' ? 1 : 0 }]}
                        source={require('@/assets/videos/endloading.mp4')}
                        useNativeControls={false}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                        shouldPlay={phase === 'ending'}
                        onPlaybackStatusUpdate={(status) => {
                            if (status.isLoaded && status.didJustFinish) {
                                handleEndVideoFinish();
                            }
                        }}
                    />
                </View>

                {/* Modern Black Progress Bar */}
                <Animated.View style={[styles.progressContainer, { opacity: progressBarOpacity }]}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </Animated.View>

                <Animated.Text style={[styles.statusText, { opacity: progressBarOpacity }]}>{statusText}</Animated.Text>

            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEFBF8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    videoContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    progressContainer: {
        width: width * 0.6, // Compact width
        height: 4,
        backgroundColor: '#E5E5EA', // Subtle gray track
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#1C1C1E', // Modern Black
        borderRadius: 2,
    },
    statusText: {
        fontSize: 12, // Smaller, more minimal
        color: '#8E8E93', // Muted gray
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    }
});
