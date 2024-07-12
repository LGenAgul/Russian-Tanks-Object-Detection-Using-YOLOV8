import cv2
from ultralytics import YOLO

model = YOLO(r'weights.pt')
results = model.track(source='rtsp:...', show=True)
video_cap = cv2.VideoCapture(results)

while True:
    ret, frame = video_cap.read()
    model.cpu()

    if not ret:
        break

    cv2.imshow("Frame", frame)

    if cv2.waitKey(1) == ord("q"):
        break

video_cap.release()
cv2.destroyAllWindows()