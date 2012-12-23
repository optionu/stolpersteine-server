var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var schema = new Schema({
	person: {
		name: { type: String, required: true, trim: true }
	},
	location: {
		street: { type: String, required: true, trim: true },
		zipCode: { type: String, required: true, trim: true },
		city: { type: String, required: true, trim: true },
		coordinates: {
			longitude: { type: Number, required: true },
			latitude: { type: Number, required: true }
		},
	},
	laidAt : { 
		year: { type: Number, required: true, min: 1992 },
		month: { type: Number, min: 0, max: 11 },
		date: { type: Number, min: 0, max: 31 }
	},
	description: { type: String, trim: true },
	image: { type: Buffer },
	sources: [{
		url: { type: String, trim: true },
		name: { type: String, trim: true },
		retrievedAt: { type: Date }
	}],
	createdAt: { type: Date },
	updatedAt: { type: Date }
});

schema.methods.convertToGeoJSON = function() {
	return { 
		"type": "Feature", 
		"geometry": {
			"type": "Point", 
			"coordinates": [this.location.longitude, this.location.latitude]
		}
	};
}

// Automatically maintain created and updated dates
schema.pre('save', function (next) {
	// This overwrites model data for createdAt and updatedAt
	if (this.isNew) {
		this.createdAt = this.updatedAt = new Date;
	} else {
		this.updatedAt = new Date;
	}
	next();
});

exports.Stolperstein = mongoose.model('Stolperstein', schema, 'stolpersteine');