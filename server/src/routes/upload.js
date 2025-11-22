import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { authenticateToken } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if this is a pet upload by checking the route path
    // req.path might be /upload/pet/:petId or /api/upload/pet/:petId
    const isPetUpload = req.path && (req.path.includes('/pet/') || req.path.includes('/upload/pet/'));
    const uploadType = req.body?.type || (isPetUpload ? 'pet' : 'profile');
    const uploadDir = path.join(__dirname, '../../uploads', uploadType === 'pet' ? 'pets' : 'profiles');
    
    console.log('Multer destination:', {
      path: req.path,
      isPetUpload,
      uploadType,
      uploadDir,
      bodyType: req.body?.type
    });
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp.extension
    const userId = req.user.id.replace(/-/g, '');
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

export default function uploadRoutes(db) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Error handling middleware for multer (must be 4-parameter function)
  const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  };

  // Upload profile picture
  router.post('/profile', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  }, async (req, res) => {
    let originalFilePath = null;
    let resizedFilePath = null;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('File uploaded:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      originalFilePath = req.file.path;
      resizedFilePath = originalFilePath.replace(path.extname(originalFilePath), '_resized.jpg');
      
      console.log('Processing image:', { originalFilePath, resizedFilePath });
      
      // Check if file exists before processing
      if (!fs.existsSync(originalFilePath)) {
        return res.status(400).json({ error: 'Uploaded file not found' });
      }
      
      // Resize and optimize image: 400x400 max, square crop, convert to JPEG
      await sharp(originalFilePath)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toFile(resizedFilePath);
      
      console.log('Image resized successfully');

      // Delete original file
      if (fs.existsSync(originalFilePath)) {
        fs.unlinkSync(originalFilePath);
      }

      // Update filename to use resized version
      const resizedFilename = path.basename(resizedFilePath);
      const fileUrl = `/uploads/profiles/${resizedFilename}`;
      
      console.log('Updating database with file URL:', fileUrl);
      
      // Update user's profile picture URL
      await db.execute(
        'UPDATE users SET profile_picture_url = ?, profile_picture_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [fileUrl, req.user.id]
      );

      console.log('Profile picture updated successfully');
      
      res.json({ 
        url: fileUrl,
        message: 'Profile picture uploaded successfully'
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      
      // Delete uploaded file if database update fails
      if (originalFilePath && fs.existsSync(originalFilePath)) {
        try {
          fs.unlinkSync(originalFilePath);
        } catch (unlinkError) {
          console.error('Error deleting original file:', unlinkError);
        }
      }
      
      // Delete resized file if it exists
      if (resizedFilePath && fs.existsSync(resizedFilePath)) {
        try {
          fs.unlinkSync(resizedFilePath);
        } catch (unlinkError) {
          console.error('Error deleting resized file:', unlinkError);
        }
      }
      
      // Ensure we send a proper JSON response
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to upload profile picture',
          message: error.message || 'Unknown error occurred'
        });
      }
    }
  });

  // Upload pet picture
  router.post('/pet/:petId', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  }, async (req, res) => {
    let originalFilePath = null;
    let resizedFilePath = null;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { petId } = req.params;
      originalFilePath = req.file.path;
      resizedFilePath = originalFilePath.replace(path.extname(originalFilePath), '_resized.jpg');

      // Verify pet belongs to user
      const [pets] = await db.execute(
        'SELECT * FROM pets WHERE id = ? AND owner_id = ?',
        [petId, req.user.id]
      );

      if (pets.length === 0) {
        // Delete uploaded file
        if (fs.existsSync(originalFilePath)) {
          fs.unlinkSync(originalFilePath);
        }
        return res.status(404).json({ error: 'Pet not found' });
      }

      // Resize and optimize image: 300x300 max, square crop, convert to JPEG
      await sharp(originalFilePath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toFile(resizedFilePath);

      // Delete original file
      if (fs.existsSync(originalFilePath)) {
        fs.unlinkSync(originalFilePath);
      }

      // Delete old pet picture if exists
      const oldPet = pets[0];
      if (oldPet.photo_url) {
        const oldPath = path.join(__dirname, '../../', oldPet.photo_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update filename to use resized version
      const resizedFilename = path.basename(resizedFilePath);
      const fileUrl = `/uploads/pets/${resizedFilename}`;

      console.log('Pet picture upload:', {
        petId,
        originalFilePath,
        resizedFilePath,
        resizedFilename,
        fileUrl,
        fileExists: fs.existsSync(resizedFilePath)
      });

      // Update pet's photo URL
      await db.execute(
        'UPDATE pets SET photo_url = ? WHERE id = ?',
        [fileUrl, petId]
      );

      console.log('Pet photo_url updated in database:', fileUrl);

      res.json({ 
        url: fileUrl,
        message: 'Pet picture uploaded successfully'
      });
    } catch (error) {
      console.error('Upload pet picture error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      
      // Delete uploaded file if database update fails
      if (originalFilePath && fs.existsSync(originalFilePath)) {
        try {
          fs.unlinkSync(originalFilePath);
        } catch (unlinkError) {
          console.error('Error deleting original file:', unlinkError);
        }
      }
      
      // Delete resized file if it exists
      if (resizedFilePath && fs.existsSync(resizedFilePath)) {
        try {
          fs.unlinkSync(resizedFilePath);
        } catch (unlinkError) {
          console.error('Error deleting resized file:', unlinkError);
        }
      }
      
      // Ensure we send a proper JSON response
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to upload pet picture',
          message: error.message || 'Unknown error occurred'
        });
      }
    }
  });

  // Delete profile picture
  router.delete('/profile', async (req, res) => {
    try {
      // Get current profile picture
      const [users] = await db.execute(
        'SELECT profile_picture_url FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length > 0 && users[0].profile_picture_url) {
        const filePath = path.join(__dirname, '../../', users[0].profile_picture_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Update database
      await db.execute(
        'UPDATE users SET profile_picture_url = NULL WHERE id = ?',
        [req.user.id]
      );

      res.json({ message: 'Profile picture deleted successfully' });
    } catch (error) {
      console.error('Delete profile picture error:', error);
      res.status(500).json({ error: 'Failed to delete profile picture' });
    }
  });

  // Delete pet picture
  router.delete('/pet/:petId', async (req, res) => {
    try {
      const { petId } = req.params;

      // Verify pet belongs to user
      const [pets] = await db.execute(
        'SELECT photo_url FROM pets WHERE id = ? AND owner_id = ?',
        [petId, req.user.id]
      );

      if (pets.length === 0) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      if (pets[0].photo_url) {
        const filePath = path.join(__dirname, '../../', pets[0].photo_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Update database
      await db.execute(
        'UPDATE pets SET photo_url = NULL WHERE id = ?',
        [petId]
      );

      res.json({ message: 'Pet picture deleted successfully' });
    } catch (error) {
      console.error('Delete pet picture error:', error);
      res.status(500).json({ error: 'Failed to delete pet picture' });
    }
  });

  return router;
}

