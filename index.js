require('dotenv').config()
const AWS = require('aws-sdk');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const cron = require('cron');
const { transporter } = require('./utils/mailer');

// AWS S3 configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// MongoDB backup configuration
const mongoBackupOptions = {
    uri: process.env.DATABASE_URI,
    root: __dirname,
    tar: process.env.BACKUP_FILE_NAME, // Backup file name
    callback: function (err) {
        if (err) {
            console.error('MongoDB backup failed:', err);
            sendFailedEmail()
        } else {
            console.log('MongoDB backup successful');
            deleteLastBackupFromS3();

            uploadToS3();
        }
    },
};

// Email configuration
const mailOptions = {
    from: 'your_email@gmail.com',
    to: 'your_email@gmail.com',
    subject: 'Backup Successful',
    text: 'Your database backup was successful.',
};

// Schedule the job to run every 2 days at 12 AM
const cronJob = cron.job('0 0 0 */2 * *', function () {
    console.log('Running backup job...');

    // Delete the last backup from S3

    // Create a MongoDB backup
    exec(`mongodump --uri ${mongoBackupOptions.uri} --archive=${mongoBackupOptions.root}/${mongoBackupOptions.tar}`, mongoBackupOptions.callback);
});

// Start the cron job
cronJob.start();

function deleteLastBackupFromS3() {
    // Use the appropriate S3 bucket name and file key
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: process.env.BACKUP_FILE_NAME, // Adjust this according to your backup file name
    };

    s3.deleteObject(params, function (err, data) {
        if (err) {
            console.error('Error deleting last backup from S3:', err);
        } else {
            console.log('Deleted last backup from S3:', data);
        }
    });
}

function uploadToS3() {
    // Read the backup file
    const backupData = require('fs').readFileSync(mongoBackupOptions.tar);

    // Upload the backup file to S3
    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: process.env.BACKUP_FILE_NAME, // Adjust this according to your backup file name
        Body: backupData,
    };

    s3.upload(uploadParams, function (err, data) {
        if (err) {
            console.error('Error uploading backup to S3:', err);
        } else {
            console.log('Backup uploaded to S3:', data);

            // Delete the local backup file
            deleteLocalBackup();
        }
    });
}

function deleteLocalBackup() {
    // Delete the local backup file
    require('fs').unlinkSync(mongoBackupOptions.tar);
    console.log('Local backup deleted');

    // Send a success email
    sendSuccessEmail();
}

function sendSuccessEmail() {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}
function sendFailedEmail() {
    const mailOptions = {
        from: 'your_email@gmail.com',
        to: 'your_email@gmail.com',
        subject: 'Backup Failed',
        text: 'check your system',
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}
