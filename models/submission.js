const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'question',
    required: true
  },
  iscorrect: {
    type: Boolean,
    required: true,
    default: false
  },
  submitted_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one submission per team per question (if needed)
// Uncomment the line below if you want to prevent multiple submissions per team per question
// submissionSchema.index({ team_id: 1, questions_id: 1 }, { unique: true });

// Index for better query performance
submissionSchema.index({ user_id: 1 });
submissionSchema.index({ question_id: 1 });
submissionSchema.index({ iscorrect: 1 });
submissionSchema.index({ submitted_at: -1 }); // For recent submissions queries

module.exports = mongoose.model('Submission', submissionSchema);