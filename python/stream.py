import cv2
import math
import base64
import socketio
from ultralytics import YOLO

# Start webcam
cap = cv2.VideoCapture(0)
cap.set(3, 640)
cap.set(4, 480)

# Load YOLO model
model = YOLO("../weights.pt")

# Object classes
classNames = ['bm-21','bmd-2', 'bmp-1', 'bmp-2', 'btr-70', 'btr-80', 'mt-lb', 't-64', 't-72', 't-80']

# Socket.IO client setup
sio = socketio.Client()

@sio.event
def connect():
    print('Connected to server')

@sio.event
def disconnect():
    print('Disconnected from server')

# Connect to server
sio.connect('http://127.0.0.1')


# Main loop
while True:
    success, img = cap.read()
    if not success:
        print("Error: Failed to read frame from webcam.")
        break

    # Perform object detection
    results = model(img, stream=True, device='0')

    # Draw bounding boxes and labels
    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)
            confidence = math.ceil((box.conf[0] * 100)) / 100
            cls = int(box.cls[0])
            cv2.putText(img, classNames[cls], (x1, y1), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

 
    #send the data to the server :) or alteasst try
    
    _, buffer = cv2.imencode('.jpg', img)
    img_bytes = base64.b64encode(buffer).decode('utf-8')

    # Send the base64 encoded image data to the server
    sio.emit('data', img_bytes)

    # Check for exit key
    if cv2.waitKey(1) == ord('q'):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()
