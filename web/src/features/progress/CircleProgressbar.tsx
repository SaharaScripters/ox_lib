import React from 'react';
import {createStyles, keyframes, RingProgress, Stack, Text, useMantineTheme} from '@mantine/core';
import {useNuiEvent} from '../../hooks/useNuiEvent';
import {fetchNui} from '../../utils/fetchNui';
import ScaleFade from '../../transitions/ScaleFade';
import type {CircleProgressbarProps} from '../../typings';

const useStyles = createStyles((theme, params: { position: 'middle' | 'bottom' }) => ({
  container: {
    width: '100%',
    height: params.position === 'middle' ? '100%' : '20%',
    bottom: 0,
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progress: {
    '> svg > circle:nth-child(1)': {
      stroke: theme.colors.dark[5],
    },
  },
  value: {
    textAlign: 'center',
    fontFamily: 'Roboto Mono',
    textShadow: theme.shadows.sm,
    color: theme.colors.gray[3],
  },
  label: {
    textAlign: 'center',
    textShadow: theme.shadows.sm,
    color: theme.colors.gray[3],
    height: 25,
  },
  wrapper: {
    marginTop: params.position === 'middle' ? 25 : undefined,
  },
}));

const CircleProgressbar: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState<'middle' | 'bottom'>('middle');
  const [value, setValue] = React.useState(0);
  const [label, setLabel] = React.useState('');
  const theme = useMantineTheme();
  const { classes } = useStyles({ position });

  // Refs to store interval and start time for cleanup and accurate timing
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const durationRef = React.useRef<number>(0);
  const animationFrameRef = React.useRef<number>(0);

  // Cleanup function
  const cleanupProgress = React.useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }, []);

  // More accurate progress update using requestAnimationFrame
  const updateProgress = React.useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const progress = Math.min((elapsed / durationRef.current) * 100, 100);

    setValue(Math.floor(progress));

    if (progress < 100) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      setValue(100);
      // Small delay before hiding to ensure 100% is visible
      setTimeout(() => {
        setVisible(false);
      }, 100);
    }
  }, []);

  // Start progress animation
  const startProgress = React.useCallback((data: CircleProgressbarProps) => {
    cleanupProgress(); // Clean up any existing progress

    setVisible(true);
    setValue(0);
    setLabel(data.label || '');
    setPosition(data.position || 'middle');

    startTimeRef.current = Date.now();
    durationRef.current = data.duration;

    // Start the animation
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [updateProgress, cleanupProgress]);

  useNuiEvent('progressCancel', () => {
    cleanupProgress();
    setValue(99); // Set to 99% to indicate cancellation
    setVisible(false);
  });

  useNuiEvent<CircleProgressbarProps>('circleProgress', (data) => {
    // Always start new progress, cleaning up any existing one
    startProgress(data);
  });

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupProgress();
    };
  }, [cleanupProgress]);

  return (
    <>
      <Stack spacing={0} className={classes.container}>
        <ScaleFade visible={visible} onExitComplete={() => fetchNui('progressComplete')}>
          <Stack spacing={0} align="center" className={classes.wrapper}>
            <RingProgress
              size={90}
              thickness={7}
              sections={[{ value: value, color: theme.primaryColor }]}
              className={classes.progress}
              label={<Text className={classes.value}>{value}%</Text>}
            />
            {label && <Text className={classes.label}>{label}</Text>}
          </Stack>
        </ScaleFade>
      </Stack>
    </>
  );
};

export default CircleProgressbar;
