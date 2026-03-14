import AppLayout from '../components/AppLayout';
import styles from './PlaceholderPage.module.css';

export default function PlaceholderPage({ title }) {
  return (
    <AppLayout>
      <h1 className={styles.pageTitle}>{title}</h1>
      <div className={styles.container}>
        <p className={styles.message}>Developing in progress...</p>
      </div>
    </AppLayout>
  );
}
