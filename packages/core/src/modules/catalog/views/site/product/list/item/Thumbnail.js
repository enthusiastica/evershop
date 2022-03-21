import PropTypes from 'prop-types';
import React from 'react';

function Thumbnail({ imageUrl, alt }) {
  return (
    <div className="product-thumbnail-listing">
      {imageUrl && <img src={imageUrl} alt={alt} />}
      {!imageUrl && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
    </div>
  );
}

Thumbnail.propTypes = {
  alt: PropTypes.string,
  imageUrl: PropTypes.string
};

Thumbnail.defaultProps = {
  alt: '',
  imageUrl: ''
};

export { Thumbnail };