// app/page.js

"use client";

import { useState } from 'react';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [purgedFiles, setPurgedFiles] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!url) {
      setMessage('Please enter a valid URL.');
      return;
    }

    const formData = new FormData();
    formData.append('url', url);

    const response = await fetch('/api/purge', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      setMessage('CSS files processed successfully!');
      setPurgedFiles(result.files);
    } else {
      setMessage('Error processing the URL.');
      setPurgedFiles([]);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>CSS Optimizer</h1>
      <p style={styles.description}>Enter a website URL to fetch and optimize its CSS files.</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://example.com"
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Fetch and Purge CSS</button>
      </form>

      {message && <p style={styles.message}>{message}</p>}

      {purgedFiles.length > 0 && (
        <div style={styles.downloadSection}>
          <h2 style={styles.downloadTitle}>Download Purged CSS Files</h2>
          <ul style={styles.fileList}>
            {purgedFiles.map((file, index) => (
              <li key={index} style={styles.fileItem}>
                <a href={file.url} download style={styles.fileLink}>
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  },
  title: {
    textAlign: 'center',
    color: '#333',
  },
  description: {
    textAlign: 'center',
    color: '#666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    padding: '10px 15px',
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  buttonHover: {
    backgroundColor: '#005bb5',
  },
  message: {
    textAlign: 'center',
    color: '#d9534f',
  },
  downloadSection: {
    marginTop: '20px',
  },
  downloadTitle: {
    textAlign: 'center',
    color: '#333',
  },
  fileList: {
    listStyle: 'none',
    padding: '0',
  },
  fileItem: {
    margin: '5px 0',
  },
  fileLink: {
    color: '#0070f3',
    textDecoration: 'none',
  },
};
