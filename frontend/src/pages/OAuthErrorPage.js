import styles from './OAuthResultPage.module.css';

export default function OAuthErrorPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconError}>!</div>
        <h1 className={styles.title}>Connection Failed</h1>
        <p className={styles.message}>
          Something went wrong during authorization. Please contact the person who sent you the link.
        </p>
      </div>
    </div>
  );
}
