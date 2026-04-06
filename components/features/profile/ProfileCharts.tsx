import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-gifted-charts';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface ProfileChartsProps {
  todayHourlyStats: any[];
  weeklyStats: any[];
  theme: 'light' | 'dark';
}

export const ProfileCharts: React.FC<ProfileChartsProps> = ({
  todayHourlyStats,
  weeklyStats,
  theme,
}) => {
  const { t } = useTranslation();
  const windowWidth = Dimensions.get('window').width;

  return (
    <>
      <View style={[styles.chartCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
        <ThemedText type="subtitle" style={styles.chartTitle}>{t('profile.charts.todayTitle')}</ThemedText>
        {todayHourlyStats.length > 0 && todayHourlyStats.some(i => i.value > 0) ? (
          <BarChart
            data={todayHourlyStats}
            barWidth={12}
            spacing={10}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: Colors[theme].text, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: Colors[theme].text, fontSize: 10, width: 30 }}
            noOfSections={3}
            maxValue={Math.max(...todayHourlyStats.map(i => i.value), 60)}
            frontColor={Colors[theme].tint}
            width={windowWidth - 80}
          />
        ) : (
          <ThemedText style={{ opacity: 0.5, textAlign: 'center', marginVertical: 20 }}>{t('profile.charts.todayEmpty')}</ThemedText>
        )}
      </View>

      <View style={[styles.chartCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
        <ThemedText type="subtitle" style={styles.chartTitle}>{t('profile.charts.weekTitle')}</ThemedText>
        {weeklyStats.length > 0 && weeklyStats.some(i => i.value > 0) ? (
          <BarChart
            data={weeklyStats}
            barWidth={windowWidth > 380 ? 22 : 16}
            spacing={windowWidth > 380 ? 20 : 15}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: Colors[theme].text, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: Colors[theme].text, fontSize: 10 }}
            noOfSections={3}
            maxValue={Math.max(...weeklyStats.map(i => i.value), 60)}
            frontColor={Colors[theme].tint}
            width={windowWidth - 100}
          />
        ) : (
          <ThemedText style={{ opacity: 0.5, textAlign: 'center', marginVertical: 20 }}>{t('profile.charts.weekEmpty')}</ThemedText>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  chartTitle: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
