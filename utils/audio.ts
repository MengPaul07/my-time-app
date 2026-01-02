import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// 预定义的音效 URL (使用在线资源以确保开箱即用，建议替换为本地资源)
const SOUND_URLS = {
  start: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3', // 清脆的小铃铛
  complete: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3', // 柔和的风铃
  end: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3', // 低沉的铃声
  tick: 'https://www.soundjay.com/buttons/sounds/button-20.mp3', // 滑动音效
};

class SoundManager {
  private sounds: { [key: string]: Audio.Sound } = {};
  private isMuted: boolean = false;

  constructor() {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(err => console.log('Failed to set audio mode', err));
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  getMuteStatus() {
    return this.isMuted;
  }

  async playSound(type: 'start' | 'complete' | 'end' | 'tick') {
    // 1. 无论是否静音，都触发震动 (除了 tick，tick 在滑块组件内部处理)
    if (type !== 'tick') {
      if (type === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'end') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    // 2. 如果静音，则不播放声音
    if (this.isMuted) {
      return;
    }

    try {
      // 卸载之前的同类型声音 (防止重叠)
      if (this.sounds[type]) {
        await this.sounds[type].unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: SOUND_URLS[type] },
        { shouldPlay: true }
      );
      
      this.sounds[type] = sound;

      // 播放结束后自动卸载
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          delete this.sounds[type];
        }
      });
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  }
}

export const soundManager = new SoundManager();
