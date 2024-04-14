from collections import Counter
import subprocess
import sys


def tankName(label):
    tanks = ["bm-21","bmd-2", "bmp-1" ,"bmp-2", "btr-70", "btr-80" ,"mt-lb","t-72", "t-64" , "t-80"]
    for tank in tanks:
        if tank in label:
            return tank
    

def frequentTank(labels):
    # Count occurrences of each tank label
   
    label_counts = Counter(labels)
    # Get the most common tank label
    most_common_label = label_counts.most_common(1)
    if most_common_label:
        return most_common_label[0][0] 
    else:
        return None  


def jsExec(tank):
    code = [
        f"let tank = \"{tank}\";\n",
        f"module.exports = tank;\n"
    ]
    with open(f"js/output.js","w+") as f:
        for line in code:
            f.write(line)
            
            
def detect_objects(image_path, conf_threshold=0.5):
    
    detectedTanks = []
    
    command = [
        "yolo",
        "task=detect",
        "mode=predict",
        f"model=weights.pt",
        # we do not want to show outside of app
        "show=False", 
        f"source={image_path}",
        "project=./",
        "name=outputs",
        "exist_ok=True"
    ]

    try:
        # Run the YOLO command and capture the output
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, text=True)
        
        # Extract the detected labels from the output
        labels = output.split('\n')
        labels = [label for label in labels if label.startswith("image") or label.startswith("video")]
        for label in labels:
            # print(label)
            detectedTanks.append(tankName(label))
     
        print(frequentTank(detectedTanks))  
        jsExec(frequentTank(detectedTanks))
      
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python detect_objects.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    detect_objects(image_path)


