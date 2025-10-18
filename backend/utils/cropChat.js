const buildCropChatRoomKey = (cropId, farmerId, buyerId) => {
  return `crop-${cropId}-farmer-${farmerId}-buyer-${buyerId}`;
};

module.exports = {
  buildCropChatRoomKey
};
