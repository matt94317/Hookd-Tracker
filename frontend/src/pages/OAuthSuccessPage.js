import styles from './OAuthResultPage.module.css';

export default function OAuthSuccessPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconSuccess}>&#10003;</div>
        <h1 className={styles.title}>Account Connected</h1>
        <p className={styles.message}>
          Your account has been connected successfully. You may close this tab.
        </p>
      </div>
    </div>
  );
}
