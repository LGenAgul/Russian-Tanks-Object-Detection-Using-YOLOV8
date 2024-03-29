from ultralytics import YOLO
import sys
# Load your model

def main(argv):
    try:
        model = YOLO('./weights.pt')

        file_path = sys.argv[1]
        # Run inference
        results = model(file_path)

        # Extract class IDs and names
        for result in results:
            class_ids = result.boxes.cls
            class_names = [model.names[int(cls_id)] for cls_id in class_ids]

            print("Class IDs:", class_ids)
            print("Class Names:", class_names)

            # Save the image with detected objects
            result.save(filename="./outputs/test.jpg")
    except Exception as e:
        print(e)


if __name__ == "__main__":
   main(sys.argv)