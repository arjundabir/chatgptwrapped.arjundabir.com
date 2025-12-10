'use client';
import styles from '@/components/logo-animation.module.css';
import { useEffect, useRef } from 'react';

const LogoAnimation = () => {
  const pathRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (pathRef.current) {
      const pathLength = pathRef.current.getTotalLength();
      console.log('Path length: ', pathLength);
    }
  }, []);

  return (
    <svg
      id="Layer_1"
      className={styles.logoPath}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
    >
      <path
        ref={pathRef}
        className={styles.path1}
        d="M357.79,5.91c-16.64,4.83-38.41,7.94-70.9,20.7-80.31,31.54-124.25,59.5-194.96,81.57-16.4,5.12-49.85,19.46-71.2,24.53-11.34,2.69-19.46,3.86-20.18,1.87-.74-2.02,6.12-7.57,17.35-13.32,20.12-10.31,54.27-21.26,83.96-13.66,30.02,7.69,40.85,27.32,55.42,100.4,5.61,28.14-7.48-235.94-16.27-204.97-2.35,8.28-8.8,45.64-39.15,104.57-22.03,42.76-49.96,72.97-71.16,92.46"
      />
    </svg>
  );
};

export default LogoAnimation;
