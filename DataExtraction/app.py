from flask import Flask, request, jsonify, render_template
import numpy as np
import cv2
import tensorflow as tf
import xml.etree.ElementTree as ET
from PIL import Image
import io
from keras.models import Model
from keras.layers import Input, Conv2D, MaxPooling2D, Reshape, Bidirectional, LSTM, Dense, Activation, BatchNormalization, Dropout
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)


tree = ET.parse('C:/Users/yasmi/Desktop/data.xml')
root = tree.getroot()

def preprocess(img):
    (h, w) = img.shape
    final_img = np.ones([64, 256]) * 255  
    if w > 256:
        img = img[:, :256]
    if h > 64:
        img = img[:64, :]
    final_img[:h, :w] = img
    return cv2.rotate(final_img, cv2.ROTATE_90_CLOCKWISE)

alphabets = u"!\"#&'()*+,-./0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz "
num_of_characters = len(alphabets) + 1  # +1 for CTC blank

def num_to_label(num):
    alphabets = u"!\"#&'()*+,-./0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz "
    ret = ""
    for ch in num:
        if ch == -1:  # CTC Blank
            break
        else:
            ret += alphabets[ch]
    return ret

input_data = Input(shape=(256, 64, 1), name='input')

inner = Conv2D(32, (3, 3), padding='same', name='conv1', kernel_initializer='he_normal')(input_data)
inner = BatchNormalization()(inner)
inner = Activation('relu')(inner)
inner = MaxPooling2D(pool_size=(2, 2), name='max1')(inner)

inner = Conv2D(64, (3, 3), padding='same', name='conv2', kernel_initializer='he_normal')(inner)
inner = BatchNormalization()(inner)
inner = Activation('relu')(inner)
inner = MaxPooling2D(pool_size=(2, 2), name='max2')(inner)
inner = Dropout(0.3)(inner)

inner = Conv2D(128, (3, 3), padding='same', name='conv3', kernel_initializer='he_normal')(inner)
inner = BatchNormalization()(inner)
inner = Activation('relu')(inner)
inner = MaxPooling2D(pool_size=(1, 2), name='max3')(inner)
inner = Dropout(0.3)(inner)

# CNN to RNN
inner = Reshape(target_shape=(64, 1024), name='reshape')(inner)
inner = Dense(64, activation='relu', kernel_initializer='he_normal', name='dense1')(inner)

# RNN layers
inner = Bidirectional(LSTM(256, return_sequences=True), name='lstm1')(inner)
inner = Bidirectional(LSTM(256, return_sequences=True), name='lstm2')(inner)

# Output layer
inner = Dense(num_of_characters, kernel_initializer='he_normal', name='dense2')(inner)
y_pred = Activation('softmax', name='softmax')(inner)

model = Model(inputs=input_data, outputs=y_pred)
model.load_weights('C:/Users/yasmi/DataExtractingFromPDF/C_LSTM_best.keras')

@app.route('/', methods=['GET'])
def index():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if file:
        
        image = np.array(Image.open(file).convert('L'))

        
        extracted_data = {}

        
        preprocessed_image = preprocess(image) / 255.0

      
        pred = model.predict(preprocessed_image.reshape(1, 256, 64, 1))
        decoded = tf.keras.backend.get_value(tf.keras.backend.ctc_decode(pred, input_length=np.ones(pred.shape[0]) * pred.shape[1], greedy=True)[0][0])

        
        for field in root.findall('field'):
            field_name = field.get('name')
            coords = field.find('coordinates')

            x1 = int(coords.find('x1').text)
            y1 = int(coords.find('y1').text)
            x2 = int(coords.find('x2').text)
            y2 = int(coords.find('y2').text)

           
            cropped_image = image[y1:y2, x1:x2]

            
            preprocessed_image = preprocess(cropped_image) / 255.0

           
            pred = model.predict(preprocessed_image.reshape(1, 256, 64, 1))
            decoded = tf.keras.backend.get_value(tf.keras.backend.ctc_decode(pred, input_length=np.ones(pred.shape[0]) * pred.shape[1], greedy=True)[0][0])

            
            extracted_text = num_to_label(decoded[0])
            extracted_data[field_name] = extracted_text

        
        data = {
            "nom": extracted_data.get("nom", ""),
            "prenom": extracted_data.get("prenom", ""),
            "nomdejeunefille": extracted_data.get("nomdejeunefille", ""),
            "datedenai": extracted_data.get("datedenai", ""),
            "nationalite": extracted_data.get("nationalite", ""),
            "proff": extracted_data.get("proff", ""),
            "id": extracted_data.get("id", ""),
            "date": extracted_data.get("date", ""),
            "venant": extracted_data.get("venant", ""),
            "domicile": extracted_data.get("domicile", "")
        }

        
        connection = mysql.connector.connect(
            host="localhost",
            user="root",  
            password="",  
            database="dataext"
        )

        
        if connection.is_connected():
            print("Connected to MySQL database")
        else:
            print("Failed to connect to MySQL database")

        cursor = connection.cursor()

        
        insert_query = """
        INSERT INTO extracteddata (PDFid, Nom, Prenom, Nomdejeunefille, Datedenaiss, Nationalite, Profession, CIN, Date, Venant, Domicile)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        # Data to insert
        data_to_insert = (
            "form_image_path",  
            extracted_data.get("nom", ""),
            extracted_data.get("prenom", ""),
            extracted_data.get("nomdejeunefille", ""),
            extracted_data.get("datedenai", ""),
            extracted_data.get("nationalite", ""),
            extracted_data.get("proff", ""),
            extracted_data.get("id", ""),
            extracted_data.get("date", ""),
            extracted_data.get("venant", ""),
            extracted_data.get("domicile", "")
        )

        
        cursor.execute(insert_query, data_to_insert)

        
        connection.commit()

        print(cursor.rowcount, "record inserted.")

        
        cursor.close()
        connection.close()

        return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
