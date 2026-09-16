import { Component } from 'solid-js';

import styles from './Skeleton.module.scss';

const CryptoPriceSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.cryptoPriceSkeleton}>
      <div class={styles.icon}></div>
      <div class={styles.info}></div>
      <div class={styles.value}></div>
    </div>
  );
}

export default CryptoPriceSkeleton;
