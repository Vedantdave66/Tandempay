import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from './api';

export async function registerForPushNotificationsAsync(): Promise<void> {
    if (Platform.OS === 'web') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const stored = await AsyncStorage.getItem('push_token');
    if (stored === token) return;

    await authApi.updateProfile({ push_token: token });
    await AsyncStorage.setItem('push_token', token);
}
