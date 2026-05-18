import tensorflow as tf
import cv2
import xml.etree.ElementTree as ET
import numpy as np
from pdf2image import convert_from_path
#import mysql.connector


pdf_path = 'C:\\Users\\yasmi\\Downloads\\Vorderseite.pdf'


images = convert_from_path(pdf_path)


image_path = 'output_image.jpg'
images[0].save(image_path, 'JPEG')

#print(f"Image saved to {image_path}")

model = tf.keras.models.load_model('C:/Users/yasmi/DataExtractingFromPDF/handwritingrecognition.weights.h5')

tree = ET.parse('C:/Users/yasmi/Desktop/data.xml')
root = tree.getroot()

CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

def decode_ctc_predictions(pred):
    """Convert CTC decoded indices to characters."""
    decoded_indices = tf.keras.backend.get_value(
        tf.keras.backend.ctc_decode(pred, input_length=np.ones(pred.shape[0]) * pred.shape[1], greedy=True)[0][0]
    )
    decoded_texts = []
    for indices in decoded_indices:
        text = ''.join([CHARSET[i] for i in indices if i < len(CHARSET)])
        decoded_texts.append(text)
    return decoded_texts

fields = {}
for field in root.findall('field'):
    name = field.get('name')
    x1 = int(field.find('coordinates/x1').text)
    y1 = int(field.find('coordinates/y1').text)
    x2 = int(field.find('coordinates/x2').text)
    y2 = int(field.find('coordinates/y2').text)
    fields[name] = (x1, y1, x2, y2)

image = cv2.imread('output_image.jpg')
gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
_, binary_image = cv2.threshold(gray_image, 128, 255, cv2.THRESH_BINARY)


extracted_data = {}
for field_name, (x1, y1, x2, y2) in fields.items():
    field_image = binary_image[y1:y2, x1:x2]
    field_image_resized = cv2.resize(field_image, (64, 256))
    field_image_normalized = field_image_resized / 255.0
    field_image_normalized = field_image_normalized.reshape(1, 64, 256, 1)
    predicted_text = model.predict(field_image_normalized)
    extracted_data[field_name] = decode_ctc_predictions(predicted_text)